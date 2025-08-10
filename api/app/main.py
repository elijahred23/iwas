from . import create_app
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5050)

@app.after_request
def add_cors_headers(resp):
    # same body as above
    return resp