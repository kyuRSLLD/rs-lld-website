from flask import Blueprint, request, jsonify
from openai import OpenAI
import os
from src.models.product import Product, Category

chat_bp = Blueprint('chat', __name__)

# Initialize OpenAI client lazily to avoid startup crash if key not set
_client = None

def get_openai_client():
    global _client
    if _client is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            return None
        _client = OpenAI(api_key=api_key)
    return _client


def get_product_context():
    """Get product catalog information for context"""
    try:
        products = Product.query.all()
        categories = Category.query.all()

        product_info = []
        for product in products[:30]:
            product_info.append(
                f"- {product.name} (SKU: {product.sku}): ${product.unit_price} each, "
                f"${product.bulk_price} for {product.bulk_quantity}+ units. "
                f"Category: {product.category.name if product.category else 'N/A'}. "
                f"Brand: {product.brand or 'N/A'}. Size: {product.unit_size or 'N/A'}. "
                f"In stock: {product.in_stock}."
            )

        category_info = [f"- {cat.name}: {cat.description}" for cat in categories]

        context = (
            "Product Categories:\n" + "\n".join(category_info) +
            "\n\nAvailable Products:\n" + "\n".join(product_info)
        )
        return context
    except Exception as e:
        return "Product information temporarily unavailable."


@chat_bp.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages with OpenAI integration"""
    try:
        data = request.json
        user_message = data.get('message', '')
        language = data.get('language', 'en')
        conversation_history = data.get('history', [])

        if not user_message:
            return jsonify({'error': 'Message is required'}), 400

        language_prompts = {
            'en': (
                'You are a helpful, friendly customer service assistant for RS LLD, '
                'a restaurant supply company. Help customers find the right products, '
                'answer questions about pricing, bulk discounts, and availability. '
                'Keep responses concise and helpful.'
            ),
            'zh': (
                '你是 RS LLD 餐饮供应公司的客服助手。请友好、专业地帮助客户找到适合他们餐厅需求的产品，'
                '解答关于价格、批量折扣和库存的问题。请用简体中文回答，保持简洁。'
            ),
            'ko': (
                '당신은 RS LLD 레스토랑 공급 회사의 고객 서비스 어시스턴트입니다. '
                '친절하고 전문적으로 고객이 레스토랑에 필요한 제품을 찾고, 가격, 대량 할인, '
                '재고에 대한 질문에 답변해 주세요. 한국어로 간결하게 답변하세요.'
            )
        }

        system_prompt = language_prompts.get(language, language_prompts['en'])
        product_context = get_product_context()

        messages = [
            {
                "role": "system",
                "content": (
                    f"{system_prompt}\n\n"
                    f"Here is our current product catalog:\n{product_context}\n\n"
                    "Use this information to help customers. If asked about products not in the "
                    "catalog, politely inform them and suggest similar items we do carry."
                )
            }
        ]

        for msg in conversation_history[-10:]:
            messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })

        messages.append({"role": "user", "content": user_message})

        client = get_openai_client()
        if not client:
            return jsonify({'success': False, 'error': 'AI service not configured.'}), 503

        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        assistant_message = response.choices[0].message.content

        return jsonify({
            'success': True,
            'message': assistant_message,
            'timestamp': response.created
        })

    except Exception as e:
        print(f"Chat error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred processing your message. Please try again.'
        }), 500


@chat_bp.route('/search/ai', methods=['POST'])
def ai_search():
    """AI-powered natural language product search"""
    try:
        data = request.json
        query = data.get('query', '')
        language = data.get('language', 'en')

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        # Get all products for context
        products = Product.query.filter_by(in_stock=True).all()
        categories = Category.query.all()

        product_list = []
        for p in products:
            product_list.append({
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'category': p.category.name if p.category else '',
                'brand': p.brand or '',
                'unit_price': p.unit_price,
                'bulk_price': p.bulk_price,
                'bulk_quantity': p.bulk_quantity,
                'unit_size': p.unit_size or '',
                'in_stock': p.in_stock,
                'image_url': p.image_url or ''
            })

        product_text = "\n".join([
            f"ID:{p['id']} | {p['name']} | SKU:{p['sku']} | Category:{p['category']} | "
            f"Brand:{p['brand']} | Price:${p['unit_price']} | Bulk:${p['bulk_price']} for {p['bulk_quantity']}+"
            for p in product_list
        ])

        lang_instruction = {
            'en': 'Respond in English.',
            'zh': '用简体中文回答。',
            'ko': '한국어로 답변하세요.'
        }.get(language, 'Respond in English.')

        prompt = (
            f"You are a product search assistant for RS LLD restaurant supply company. "
            f"A customer searched for: \"{query}\"\n\n"
            f"Available products:\n{product_text}\n\n"
            f"Return a JSON object with two fields:\n"
            f"1. 'product_ids': array of matching product IDs (most relevant first, max 8)\n"
            f"2. 'suggestion': a brief helpful message about the search results (1-2 sentences). {lang_instruction}\n\n"
            f"Only return valid JSON, no extra text."
        )

        client = get_openai_client()
        if not client:
            return jsonify({'error': 'AI service not configured.'}), 503

        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300
        )

        import json
        result_text = response.choices[0].message.content.strip()
        # Clean up markdown code blocks if present
        if result_text.startswith('```'):
            result_text = result_text.split('```')[1]
            if result_text.startswith('json'):
                result_text = result_text[4:]

        result = json.loads(result_text)
        matched_ids = result.get('product_ids', [])
        suggestion = result.get('suggestion', '')

        # Fetch matched products in order
        matched_products = []
        for pid in matched_ids:
            p = Product.query.get(pid)
            if p:
                matched_products.append(p.to_dict())

        return jsonify({
            'success': True,
            'products': matched_products,
            'suggestion': suggestion,
            'total': len(matched_products)
        })

    except Exception as e:
        print(f"AI search error: {str(e)}")
        # Fallback to regular search
        try:
            products = Product.query.filter(Product.name.contains(query)).all()
            return jsonify({
                'success': True,
                'products': [p.to_dict() for p in products],
                'suggestion': '',
                'total': len(products)
            })
        except:
            return jsonify({'success': False, 'error': str(e)}), 500


@chat_bp.route('/chat/session', methods=['POST'])
def create_session():
    """Create a new chat session"""
    session_id = os.urandom(16).hex()
    return jsonify({'success': True, 'session_id': session_id})
