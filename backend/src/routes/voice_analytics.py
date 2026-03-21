"""
Voice Analytics Routes
=======================
All staff endpoints require staff authentication (JWT Bearer or session cookie).
The webhook endpoint uses a shared secret for auth.

  Webhook (called by ElevenLabs / Vapi after every call)
    POST /api/voice/webhook/call-complete

  Evaluation (called by n8n cron or manually)
    POST /api/voice/evaluate

  Staff Performance Dashboard
    GET  /api/staff/voice/performance

  Agent Optimizer (AI-powered)
    POST /api/voice/optimize-agent/<agent_id>

  Manual Review Queue
    GET  /api/staff/voice/review-queue
    POST /api/staff/voice/review-queue/<call_id>/approve
    POST /api/staff/voice/review-queue/<call_id>/reject
"""

import os
import json
import threading
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, session

from src.models.user import db
from src.models.voice_analytics import CallLog, AgentPerformance

voice_analytics_bp = Blueprint('voice_analytics', __name__)

# ── Auth helpers ──────────────────────────────────────────────────────────────

def _get_staff_id():
    import jwt as _jwt
    if session.get('staff_id'):
        return session['staff_id']
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:].strip()
        if token and token not in ('null', 'undefined', 'false', ''):
            try:
                secret = os.environ.get('SECRET_KEY', 'dev-secret')
                payload = _jwt.decode(token, secret, algorithms=['HS256'])
                return payload.get('staff_id')
            except Exception:
                pass
    return None


def staff_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _get_staff_id():
            return jsonify({'error': 'Staff authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


def _staff_username():
    staff_id = _get_staff_id()
    if not staff_id:
        return 'agent'
    try:
        from src.models.order import StaffUser
        staff = StaffUser.query.get(staff_id)
        return staff.username if staff else 'agent'
    except Exception:
        return 'agent'


# ── LLM Evaluation helper ─────────────────────────────────────────────────────

EVAL_SYSTEM_PROMPT = """You are a quality assurance evaluator for LLD Restaurant Supply's AI voice agent.
Your job is to evaluate call transcripts and score the agent's performance.

Evaluate the following dimensions:
1. resolution (bool): Was the caller's primary need fully met?
2. hallucination (bool): Did the agent state any false or unverified information?
3. sentiment (string): Overall caller sentiment — positive, neutral, negative, or frustrated
4. upsell_opportunity (bool): Was there a missed opportunity to mention bulk pricing or promotions?
5. escalation_needed (bool): Should this call have been transferred to a human agent?
6. score (float 0-100): Composite quality score
7. notes (string): 2-3 sentence written evaluation explaining the score
8. prompt_suggestions (string): Specific suggestions to improve the agent's system prompt based on this call

Return ONLY valid JSON with these exact keys:
{
  "resolution": true/false,
  "hallucination": true/false,
  "sentiment": "positive|neutral|negative|frustrated",
  "upsell_opportunity": true/false,
  "escalation_needed": true/false,
  "score": 0-100,
  "notes": "...",
  "prompt_suggestions": "..."
}"""


def _run_evaluation(call_log_id: int):
    """Run LLM evaluation on a CallLog record. Safe to call in a background thread."""
    from src.main import app as flask_app
    with flask_app.app_context():
        call = CallLog.query.get(call_log_id)
        if not call or not call.transcript:
            return

        try:
            from openai import OpenAI
            client = OpenAI()

            tools_summary = ''
            if call.tools_called:
                tools_summary = '\n\nTools called during this call:\n'
                for t in call.tools_called:
                    tools_summary += f"  - {t.get('tool', 'unknown')}: input={t.get('input', {})} → output={t.get('output', {})}\n"

            user_message = f"""Call transcript:
{call.transcript}
{tools_summary}
Call duration: {call.duration_seconds or 'unknown'} seconds
Direction: {call.direction or 'unknown'}
Order placed: {call.order_placed}
Order total: ${call.order_total or 0:.2f}

Evaluate this call."""

            response = client.chat.completions.create(
                model='gpt-4.1-mini',
                max_tokens=1000,
                messages=[
                    {'role': 'system', 'content': EVAL_SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_message},
                ],
                response_format={'type': 'json_object'},
            )

            result = json.loads(response.choices[0].message.content)

            call.eval_resolution = result.get('resolution')
            call.eval_hallucination = result.get('hallucination')
            call.eval_sentiment = result.get('sentiment')
            call.eval_upsell_opportunity = result.get('upsell_opportunity')
            call.eval_escalation_needed = result.get('escalation_needed')
            call.eval_score = result.get('score')
            call.eval_notes = result.get('notes')
            call.eval_prompt_suggestions = result.get('prompt_suggestions')
            call.eval_status = 'complete'

            db.session.commit()

            # Update daily aggregated performance
            _update_agent_performance(call.sub_agent_id, call.started_at.date() if call.started_at else date.today())

        except Exception as e:
            call.eval_status = 'error'
            call.eval_notes = f'Evaluation failed: {str(e)}'
            db.session.commit()


def _update_agent_performance(sub_agent_id, perf_date):
    """Recompute and upsert the AgentPerformance row for a given agent+date."""
    calls = CallLog.query.filter_by(sub_agent_id=sub_agent_id).filter(
        db.func.date(CallLog.started_at) == perf_date,
        CallLog.eval_status == 'complete'
    ).all()

    if not calls:
        return

    total = len(calls)
    resolved = sum(1 for c in calls if c.eval_resolution)
    hallucinated = sum(1 for c in calls if c.eval_hallucination)
    positive = sum(1 for c in calls if c.eval_sentiment == 'positive')
    orders = sum(1 for c in calls if c.order_placed)
    revenue = sum(c.order_total or 0 for c in calls if c.order_placed)
    scores = [c.eval_score for c in calls if c.eval_score is not None]
    durations = [c.duration_seconds for c in calls if c.duration_seconds]
    costs = [c.estimated_cost for c in calls if c.estimated_cost]

    perf = AgentPerformance.query.filter_by(
        sub_agent_id=sub_agent_id, date=perf_date
    ).first()
    if not perf:
        perf = AgentPerformance(sub_agent_id=sub_agent_id, date=perf_date)
        db.session.add(perf)

    perf.total_calls = total
    perf.avg_duration = sum(durations) / len(durations) if durations else None
    perf.resolution_rate = resolved / total if total else None
    perf.hallucination_rate = hallucinated / total if total else None
    perf.positive_sentiment_rate = positive / total if total else None
    perf.orders_placed = orders
    perf.revenue_generated = revenue
    perf.avg_score = sum(scores) / len(scores) if scores else None
    perf.total_cost = sum(costs) if costs else None
    db.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK — ElevenLabs / Vapi sends this after every call
# ═══════════════════════════════════════════════════════════════════════════════

@voice_analytics_bp.route('/voice/webhook/call-complete', methods=['POST'])
def call_complete_webhook():
    """
    Receives call completion data from ElevenLabs or Vapi.
    Stores the call log and triggers async evaluation.

    Expected payload (ElevenLabs format, also accepts Vapi format):
    {
      "call_id": "...",
      "agent_id": "...",
      "direction": "inbound",
      "caller_phone": "+13125551234",
      "duration_seconds": 142,
      "started_at": "2026-03-21T10:00:00Z",
      "ended_at": "2026-03-21T10:02:22Z",
      "transcript": "Agent: Hello...\nCaller: Hi...",
      "tools_called": [...],
      "order_placed": false,
      "order_number": null,
      "order_total": null,
      "llm_tokens_used": 1200,
      "elevenlabs_characters": 450,
      "estimated_cost": 0.032
    }
    """
    # Optional webhook secret validation
    webhook_secret = os.environ.get('VOICE_WEBHOOK_SECRET', '')
    if webhook_secret:
        provided = request.headers.get('X-Webhook-Secret', '')
        if provided != webhook_secret:
            return jsonify({'error': 'Invalid webhook secret'}), 401

    data = request.json or {}

    # Normalize field names (ElevenLabs uses call_id, Vapi may use id)
    vapi_call_id = data.get('call_id') or data.get('id') or data.get('vapi_call_id')
    if not vapi_call_id:
        return jsonify({'error': 'call_id is required'}), 400

    # Prevent duplicate processing
    existing = CallLog.query.filter_by(vapi_call_id=vapi_call_id).first()
    if existing:
        return jsonify({'message': 'Already processed', 'call_log_id': existing.id}), 200

    # Resolve sub_agent_id from agent_id string if provided
    sub_agent_id = data.get('sub_agent_id')
    if not sub_agent_id and data.get('agent_id'):
        try:
            from src.models.voice_agent import VoiceSubAgent
            agent = VoiceSubAgent.query.filter_by(
                elevenlabs_agent_id=data['agent_id']
            ).first()
            if agent:
                sub_agent_id = agent.id
        except Exception:
            pass

    # Resolve customer_id from caller_phone if not provided
    customer_id = data.get('customer_id')
    if not customer_id and data.get('caller_phone'):
        try:
            from src.models.user import User
            user = User.query.filter_by(phone=data['caller_phone']).first()
            if user:
                customer_id = user.id
        except Exception:
            pass

    def _parse_dt(val):
        if not val:
            return None
        try:
            return datetime.fromisoformat(val.replace('Z', '+00:00'))
        except Exception:
            return None

    call = CallLog(
        vapi_call_id=vapi_call_id,
        sub_agent_id=sub_agent_id,
        direction=data.get('direction', 'inbound'),
        caller_phone=data.get('caller_phone'),
        customer_id=customer_id,
        duration_seconds=data.get('duration_seconds'),
        started_at=_parse_dt(data.get('started_at')),
        ended_at=_parse_dt(data.get('ended_at')),
        transcript=data.get('transcript'),
        tools_called=data.get('tools_called', []),
        order_placed=data.get('order_placed', False),
        order_number=data.get('order_number'),
        order_total=data.get('order_total'),
        llm_tokens_used=data.get('llm_tokens_used'),
        elevenlabs_characters=data.get('elevenlabs_characters'),
        estimated_cost=data.get('estimated_cost'),
        eval_status='pending',
    )
    db.session.add(call)
    db.session.commit()

    # Trigger async evaluation if transcript is available
    if call.transcript:
        t = threading.Thread(target=_run_evaluation, args=(call.id,), daemon=True)
        t.start()

    return jsonify({
        'success': True,
        'call_log_id': call.id,
        'evaluation': 'queued' if call.transcript else 'skipped (no transcript)',
    }), 201


# ═══════════════════════════════════════════════════════════════════════════════
# EVALUATION — called by n8n, cron, or manually
# ═══════════════════════════════════════════════════════════════════════════════

@voice_analytics_bp.route('/voice/evaluate', methods=['POST'])
@staff_required
def evaluate_call():
    """
    Trigger or re-trigger LLM evaluation for a specific call.

    Body:
      call_log_id (int): ID of the CallLog record to evaluate
      async (bool): If true (default), run in background thread; if false, block and return result
    """
    data = request.json or {}
    call_log_id = data.get('call_log_id')
    if not call_log_id:
        return jsonify({'error': 'call_log_id is required'}), 400

    call = CallLog.query.get(call_log_id)
    if not call:
        return jsonify({'error': 'Call log not found'}), 404
    if not call.transcript:
        return jsonify({'error': 'No transcript available for this call'}), 400

    run_async = data.get('async', True)

    if run_async:
        t = threading.Thread(target=_run_evaluation, args=(call.id,), daemon=True)
        t.start()
        return jsonify({'success': True, 'message': 'Evaluation queued', 'call_log_id': call.id})
    else:
        _run_evaluation(call.id)
        db.session.refresh(call)
        return jsonify({'success': True, 'call': call.to_dict(include_transcript=False)})


# ═══════════════════════════════════════════════════════════════════════════════
# PERFORMANCE DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@voice_analytics_bp.route('/staff/voice/performance', methods=['GET'])
@staff_required
def voice_performance():
    """
    Returns aggregated performance data for the staff portal voice dashboard.

    Query params:
      agent_id   (int)    Filter by sub_agent_id
      date_from  (str)    ISO date, default 30 days ago
      date_to    (str)    ISO date, default today
      granularity (str)   daily (default) | summary
    """
    agent_id = request.args.get('agent_id', type=int)
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    granularity = request.args.get('granularity', 'daily')

    today = date.today()
    date_from = date.fromisoformat(date_from_str) if date_from_str else today - timedelta(days=30)
    date_to = date.fromisoformat(date_to_str) if date_to_str else today

    q = AgentPerformance.query.filter(
        AgentPerformance.date >= date_from,
        AgentPerformance.date <= date_to,
    )
    if agent_id:
        q = q.filter_by(sub_agent_id=agent_id)

    rows = q.order_by(AgentPerformance.date.asc()).all()

    if granularity == 'summary':
        # Aggregate all rows into a single summary
        if not rows:
            return jsonify({'summary': None, 'date_from': str(date_from), 'date_to': str(date_to)})
        total_calls = sum(r.total_calls or 0 for r in rows)
        total_orders = sum(r.orders_placed or 0 for r in rows)
        total_revenue = sum(r.revenue_generated or 0 for r in rows)
        total_cost = sum(r.total_cost or 0 for r in rows)
        avg_score = (
            sum(r.avg_score * r.total_calls for r in rows if r.avg_score and r.total_calls) /
            max(total_calls, 1)
        )
        resolution_rate = (
            sum(r.resolution_rate * r.total_calls for r in rows if r.resolution_rate is not None and r.total_calls) /
            max(total_calls, 1)
        )
        hallucination_rate = (
            sum(r.hallucination_rate * r.total_calls for r in rows if r.hallucination_rate is not None and r.total_calls) /
            max(total_calls, 1)
        )
        return jsonify({
            'summary': {
                'total_calls': total_calls,
                'total_orders': total_orders,
                'total_revenue': round(total_revenue, 2),
                'total_cost': round(total_cost, 4),
                'avg_score': round(avg_score, 1),
                'resolution_rate': round(resolution_rate, 3),
                'hallucination_rate': round(hallucination_rate, 3),
                'roi': round(total_revenue / max(total_cost, 0.001), 1),
            },
            'date_from': str(date_from),
            'date_to': str(date_to),
        })

    return jsonify({
        'rows': [r.to_dict() for r in rows],
        'date_from': str(date_from),
        'date_to': str(date_to),
    })


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT OPTIMIZER
# ═══════════════════════════════════════════════════════════════════════════════

OPTIMIZER_SYSTEM_PROMPT = """You are a voice AI prompt engineer for LLD Restaurant Supply.
You analyze call evaluation data to improve the system prompt of a voice ordering agent.

Given a set of low-scoring call evaluations, identify patterns in failures and suggest
specific, actionable improvements to the agent's system prompt.

Focus on:
- Recurring hallucination patterns (what false info was stated?)
- Missed upsell opportunities (what should the agent say about bulk pricing?)
- Escalation failures (what triggers should cause a human handoff?)
- Sentiment issues (what caused caller frustration?)

Output valid JSON only:
{
  "analysis": "2-3 sentence summary of the main issues found",
  "suggested_system_prompt": "The full revised system prompt text",
  "changes_made": ["List of specific changes and why"],
  "expected_improvement": "What metrics should improve and by how much"
}"""


@voice_analytics_bp.route('/voice/optimize-agent/<int:agent_id>', methods=['POST'])
@staff_required
def optimize_agent(agent_id):
    """
    Analyze worst-performing calls for an agent and suggest prompt improvements.

    Body (optional):
      min_calls (int): Minimum calls needed before optimizing (default 10)
      score_threshold (float): Only analyze calls below this score (default 70)
      limit (int): Max calls to analyze (default 20)
    """
    data = request.json or {}
    min_calls = data.get('min_calls', 10)
    score_threshold = data.get('score_threshold', 70)
    limit = data.get('limit', 20)

    # Fetch worst-performing evaluated calls for this agent
    bad_calls = CallLog.query.filter_by(
        sub_agent_id=agent_id,
        eval_status='complete'
    ).filter(
        CallLog.eval_score < score_threshold
    ).order_by(CallLog.eval_score.asc()).limit(limit).all()

    total_evaluated = CallLog.query.filter_by(
        sub_agent_id=agent_id, eval_status='complete'
    ).count()

    if total_evaluated < min_calls:
        return jsonify({
            'error': f'Not enough evaluated calls. Need {min_calls}, have {total_evaluated}.'
        }), 400

    if not bad_calls:
        return jsonify({
            'message': f'No calls below score threshold of {score_threshold}. Agent is performing well!',
            'total_evaluated': total_evaluated,
        })

    # Get current agent system prompt if available
    current_prompt = ''
    try:
        from src.models.voice_agent import VoiceSubAgent
        agent = VoiceSubAgent.query.get(agent_id)
        if agent:
            current_prompt = agent.system_prompt or ''
    except Exception:
        pass

    # Build analysis input
    call_summaries = []
    for c in bad_calls:
        call_summaries.append({
            'score': c.eval_score,
            'resolution': c.eval_resolution,
            'hallucination': c.eval_hallucination,
            'sentiment': c.eval_sentiment,
            'upsell_opportunity': c.eval_upsell_opportunity,
            'escalation_needed': c.eval_escalation_needed,
            'eval_notes': c.eval_notes,
            'duration_seconds': c.duration_seconds,
            'order_placed': c.order_placed,
        })

    try:
        from openai import OpenAI
        client = OpenAI()

        user_message = f"""Current agent system prompt:
{current_prompt or '(not available)'}

Low-scoring calls to analyze ({len(bad_calls)} calls, all scored below {score_threshold}):
{json.dumps(call_summaries, indent=2)}

Total evaluated calls: {total_evaluated}
Calls below threshold: {len(bad_calls)} ({100*len(bad_calls)//total_evaluated}%)

Analyze these failures and suggest an improved system prompt."""

        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            max_tokens=3000,
            messages=[
                {'role': 'system', 'content': OPTIMIZER_SYSTEM_PROMPT},
                {'role': 'user', 'content': user_message},
            ],
            response_format={'type': 'json_object'},
        )

        result = json.loads(response.choices[0].message.content)
        return jsonify({
            'success': True,
            'agent_id': agent_id,
            'calls_analyzed': len(bad_calls),
            'total_evaluated': total_evaluated,
            'optimization': result,
        })

    except Exception as e:
        return jsonify({'error': f'Optimization failed: {str(e)}'}), 500


# ═══════════════════════════════════════════════════════════════════════════════
# MANUAL REVIEW QUEUE
# ═══════════════════════════════════════════════════════════════════════════════

@voice_analytics_bp.route('/staff/voice/review-queue', methods=['GET'])
@staff_required
def review_queue():
    """
    Returns calls that need manual staff review:
    - Score below threshold (default 60)
    - Hallucination detected
    - Escalation needed but not escalated
    - Eval status = 'complete' and not yet reviewed

    Query params:
      agent_id        (int)   Filter by agent
      score_threshold (float) Default 60
      include_reviewed (bool) Include already-reviewed calls (default false)
      limit           (int)   Default 50
    """
    agent_id = request.args.get('agent_id', type=int)
    score_threshold = request.args.get('score_threshold', 60, type=float)
    include_reviewed = request.args.get('include_reviewed', 'false').lower() == 'true'
    limit = request.args.get('limit', 50, type=int)

    q = CallLog.query.filter(
        CallLog.eval_status == 'complete',
        db.or_(
            CallLog.eval_score < score_threshold,
            CallLog.eval_hallucination == True,
            CallLog.eval_escalation_needed == True,
        )
    )
    if agent_id:
        q = q.filter_by(sub_agent_id=agent_id)
    if not include_reviewed:
        q = q.filter(CallLog.eval_reviewed_by == None)

    calls = q.order_by(CallLog.eval_score.asc()).limit(limit).all()

    return jsonify({
        'total': len(calls),
        'score_threshold': score_threshold,
        'calls': [c.to_dict(include_transcript=True) for c in calls],
    })


@voice_analytics_bp.route('/staff/voice/review-queue/<int:call_id>/approve', methods=['POST'])
@staff_required
def approve_review(call_id):
    """Mark a call evaluation as reviewed and approved (no retraining needed)."""
    call = CallLog.query.get_or_404(call_id)
    call.eval_status = 'reviewed'
    call.eval_reviewed_by = _staff_username()
    call.eval_reviewed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'call_log_id': call_id, 'status': 'reviewed'})


@voice_analytics_bp.route('/staff/voice/review-queue/<int:call_id>/reject', methods=['POST'])
@staff_required
def reject_review(call_id):
    """
    Mark a call as flagged for retraining.

    Body (optional):
      notes (str): Staff notes on why this call was flagged
    """
    call = CallLog.query.get_or_404(call_id)
    data = request.json or {}
    call.eval_status = 'flagged'
    call.eval_reviewed_by = _staff_username()
    call.eval_reviewed_at = datetime.utcnow()
    if data.get('notes'):
        call.eval_notes = (call.eval_notes or '') + f'\n\n[Staff review: {data["notes"]}]'
    db.session.commit()
    return jsonify({'success': True, 'call_log_id': call_id, 'status': 'flagged'})
