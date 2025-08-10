import argparse
from app import create_app
from app.extensions import db
from app.models import User

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--role", default="admin")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if User.query.filter_by(email=args.email.lower()).first():
            print("User already exists.")
            return
        u = User(name=args.name, email=args.email.lower(), role=args.role)
        u.set_password(args.password)
        db.session.add(u)
        db.session.commit()
        print(f"Created user {u.email} (role={u.role})")

if __name__ == "__main__":
    main()
