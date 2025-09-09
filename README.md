# RS LLD - Restaurant Supply Solutions Website

A multilingual e-commerce platform designed specifically for restaurant owners to purchase non-perishable goods with competitive bulk pricing.

## 🌟 Features

### 🌍 **Multilingual Support**
- **English** - Primary language
- **Chinese (中文)** - Complete Simplified Chinese translation
- **Korean (한국어)** - Complete Korean translation
- Proper Asian font rendering (Noto Sans SC/KR)
- Language persistence across navigation

### 🏪 **E-commerce Functionality**
- Product catalog with categories
- Bulk pricing for volume orders
- User authentication and registration
- Shopping cart and checkout process
- Inventory management system

### 📱 **Responsive Design**
- Mobile-first responsive design
- Touch-friendly navigation
- Optimized for all screen sizes
- Professional restaurant industry aesthetic

### 🔐 **User Management**
- Secure user registration and login
- Session management
- User dashboard with order history
- Demo login functionality for testing

## 🚀 **Live Demo**

**Website:** https://lnh8imcw0qzl.manus.space

**Test Login:** Use any username/password combination to test the system

## 🏗️ **Project Structure**

```
rs-lld-website/
├── frontend/           # React.js frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Language context
│   │   ├── i18n/          # Translation files
│   │   └── assets/        # Images and static files
│   ├── package.json
│   └── vite.config.js
├── backend/            # Flask backend API
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   ├── database/      # SQLite database
│   │   └── static/        # Built frontend files
│   ├── requirements.txt
│   └── main.py
├── docs/               # Documentation
│   ├── inventory_management_guide.md
│   └── website_strategy.md
├── scripts/            # Utility scripts
│   ├── inventory_manager.py
│   └── sample_inventory.csv
└── README.md
```

## 🛠️ **Technology Stack**

### Frontend
- **React.js** - Modern UI framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Router** - Client-side routing

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Lightweight database
- **Flask-CORS** - Cross-origin resource sharing

### Deployment
- **Manus Cloud** - Production hosting
- **Git** - Version control

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+
- Git

### Frontend Development

```bash
cd frontend
pnpm install
pnpm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
```

The backend API will be available at `http://localhost:5000`

### Production Build

```bash
# Build frontend
cd frontend
pnpm run build

# Copy to backend static folder
cp -r dist/* ../backend/src/static/

# Deploy backend (includes frontend)
cd ../backend
# Deploy using your preferred method
```

## 📦 **Inventory Management**

### Using the Python Script

```bash
cd scripts
python inventory_manager.py
```

**Features:**
- Interactive product management
- CSV bulk import/export
- Price updates
- Stock status management
- Search and filtering

### CSV Import Format

```csv
sku,name,category,unit_price,bulk_price,bulk_quantity,unit_size,brand,in_stock
DT-28,Diced Tomatoes - 28oz Can,Canned Goods,2.49,2.19,24,28 oz,Hunt's,true
```

### API Endpoints

```bash
# Get all products
GET /api/products

# Add new product (requires authentication)
POST /api/admin/products
{
  "name": "Product Name",
  "sku": "PROD-001",
  "category_id": 1,
  "unit_price": 9.99,
  "bulk_price": 8.99,
  "bulk_quantity": 12
}
```

## 🌐 **Internationalization**

### Adding New Languages

1. Add translations to `frontend/src/i18n/translations.js`
2. Update language options in `frontend/src/contexts/LanguageContext.jsx`
3. Add appropriate fonts in `frontend/src/App.css`

### Translation Structure

```javascript
export const translations = {
  en: {
    hero: {
      title: "We Know Running a Restaurant is Hard.",
      tagline: "Let Us Make Supplies Easy."
    }
  },
  zh: {
    hero: {
      title: "我们深知经营餐厅的艰辛",
      tagline: "让我们简化您的供应链"
    }
  }
}
```

## 🔧 **Configuration**

### Environment Variables

```bash
# Backend
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///database/app.db

# Frontend
VITE_API_BASE_URL=http://localhost:5000/api
```

### Database Schema

**Categories:**
- id, name, description, created_at

**Products:**
- id, name, description, category_id, sku, unit_price, bulk_price, bulk_quantity, unit_size, brand, in_stock, image_url, created_at, updated_at

**Users:**
- id, username, email, password_hash, company_name, phone, created_at

## 📈 **Business Features**

### Target Market
- Restaurant owners and managers
- Food service businesses
- Catering companies
- Commercial kitchens

### Value Proposition
- Competitive bulk pricing
- Reliable supply chain
- Flexible payment terms
- Industry expertise

### Product Categories
- Canned Goods
- Dry Ingredients
- Condiments & Sauces
- Cleaning Supplies
- Paper Products
- Packaging Materials

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is proprietary software owned by RS LLD. All rights reserved.

## 📞 **Support**

For technical support or business inquiries:
- Email: admin@rslld.com
- Website: https://lnh8imcw0qzl.manus.space

## 🎯 **Roadmap**

### Phase 1 (Current)
- ✅ Multilingual website (EN/CN/KR)
- ✅ Basic e-commerce functionality
- ✅ Inventory management system
- ✅ User authentication

### Phase 2 (Planned)
- 🔄 Payment processing integration
- 🔄 Order management system
- 🔄 Email notifications
- 🔄 Advanced search and filtering

### Phase 3 (Future)
- 📋 ERP system integration
- 📋 Mobile app development
- 📋 Advanced analytics
- 📋 Multi-vendor marketplace

---

**Built with ❤️ for the restaurant industry**

