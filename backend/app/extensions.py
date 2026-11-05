from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Extensions are created here and bound to the app in create_app().
cors = CORS()
db = SQLAlchemy()
migrate = Migrate()
