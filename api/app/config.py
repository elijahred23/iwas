import os
from dotenv import load_dotenv

load_dotenv()  # loads api/.env in dev

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///iwas.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT in HttpOnly cookies (SPA-friendly)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = False        # True in prod (https)
    JWT_COOKIE_SAMESITE = "Lax"      # 'None' if cross-site with https
    JWT_COOKIE_CSRF_PROTECT = False  # keep False in dev; enable in prod with X-CSRF headers

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173")
