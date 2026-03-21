"""
Voice Analytics Models
======================
CallLog        — one record per call, stores transcript, tool calls, eval scores, outcome
AgentPerformance — daily aggregated metrics per sub-agent (populated by cron/n8n)
"""

from datetime import datetime
from src.models.user import db


class CallLog(db.Model):
    __tablename__ = 'call_log'

    id = db.Column(db.Integer, primary_key=True)
    vapi_call_id = db.Column(db.String(100), unique=True, index=True)
    sub_agent_id = db.Column(db.Integer, db.ForeignKey('voice_sub_agent.id'), nullable=True)

    # ── Call metadata ──────────────────────────────────────────────────────────
    direction = db.Column(db.String(10))          # inbound | outbound
    caller_phone = db.Column(db.String(20))
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    duration_seconds = db.Column(db.Integer)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)

    # ── Transcript & tool usage ────────────────────────────────────────────────
    transcript = db.Column(db.Text)
    tools_called = db.Column(db.JSON)             # [{tool, input, output, latency_ms}]

    # ── Evaluation scores (filled by Evaluation Agent) ────────────────────────
    eval_resolution = db.Column(db.Boolean)       # Was the caller's need met?
    eval_hallucination = db.Column(db.Boolean)    # Did agent state false info?
    eval_sentiment = db.Column(db.String(20))     # positive | neutral | negative | frustrated
    eval_upsell_opportunity = db.Column(db.Boolean)  # Missed bulk pricing mention?
    eval_escalation_needed = db.Column(db.Boolean)   # Should have transferred to human?
    eval_score = db.Column(db.Float)              # 0–100 composite score
    eval_notes = db.Column(db.Text)               # LLM written evaluation
    eval_prompt_suggestions = db.Column(db.Text)  # Suggested prompt improvements
    eval_status = db.Column(db.String(20), default='pending')  # pending | complete | reviewed
    eval_reviewed_by = db.Column(db.String(100))  # staff username who reviewed
    eval_reviewed_at = db.Column(db.DateTime)

    # ── Outcome ────────────────────────────────────────────────────────────────
    order_placed = db.Column(db.Boolean, default=False)
    order_number = db.Column(db.String(20), nullable=True)
    order_total = db.Column(db.Float, nullable=True)

    # ── Cost tracking ──────────────────────────────────────────────────────────
    llm_tokens_used = db.Column(db.Integer)
    elevenlabs_characters = db.Column(db.Integer)
    estimated_cost = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_transcript=False):
        d = {
            'id': self.id,
            'vapi_call_id': self.vapi_call_id,
            'sub_agent_id': self.sub_agent_id,
            'direction': self.direction,
            'caller_phone': self.caller_phone,
            'customer_id': self.customer_id,
            'duration_seconds': self.duration_seconds,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'tools_called': self.tools_called,
            # Evaluation
            'eval_resolution': self.eval_resolution,
            'eval_hallucination': self.eval_hallucination,
            'eval_sentiment': self.eval_sentiment,
            'eval_upsell_opportunity': self.eval_upsell_opportunity,
            'eval_escalation_needed': self.eval_escalation_needed,
            'eval_score': self.eval_score,
            'eval_notes': self.eval_notes,
            'eval_prompt_suggestions': self.eval_prompt_suggestions,
            'eval_status': self.eval_status,
            'eval_reviewed_by': self.eval_reviewed_by,
            'eval_reviewed_at': self.eval_reviewed_at.isoformat() if self.eval_reviewed_at else None,
            # Outcome
            'order_placed': self.order_placed,
            'order_number': self.order_number,
            'order_total': self.order_total,
            # Cost
            'llm_tokens_used': self.llm_tokens_used,
            'elevenlabs_characters': self.elevenlabs_characters,
            'estimated_cost': self.estimated_cost,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_transcript:
            d['transcript'] = self.transcript
        return d


class AgentPerformance(db.Model):
    """Aggregated daily performance metrics per sub-agent."""
    __tablename__ = 'agent_performance'

    id = db.Column(db.Integer, primary_key=True)
    sub_agent_id = db.Column(db.Integer, db.ForeignKey('voice_sub_agent.id'), nullable=True)
    date = db.Column(db.Date, index=True)

    total_calls = db.Column(db.Integer, default=0)
    avg_duration = db.Column(db.Float)
    resolution_rate = db.Column(db.Float)         # % of calls where need was met
    hallucination_rate = db.Column(db.Float)      # % of calls with false info
    positive_sentiment_rate = db.Column(db.Float)
    orders_placed = db.Column(db.Integer, default=0)
    revenue_generated = db.Column(db.Float, default=0)
    avg_score = db.Column(db.Float)
    total_cost = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'sub_agent_id': self.sub_agent_id,
            'date': self.date.isoformat() if self.date else None,
            'total_calls': self.total_calls,
            'avg_duration': self.avg_duration,
            'resolution_rate': self.resolution_rate,
            'hallucination_rate': self.hallucination_rate,
            'positive_sentiment_rate': self.positive_sentiment_rate,
            'orders_placed': self.orders_placed,
            'revenue_generated': self.revenue_generated,
            'avg_score': self.avg_score,
            'total_cost': self.total_cost,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
