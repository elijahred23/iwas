from flask import Flask
from app.routes.integration_routes import integration_bp

app = Flask(__name__)
app.register_blueprint(integration_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(debug=True)
