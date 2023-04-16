import tensorflow as tf
import tensorflow_probability as tfp

try:
    from . import load, constants
except:
    import load, constants

def generate_offense_vectorizer():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(len(load.team_indices), activation='linear', use_bias=False),
        tf.keras.layers.Dense(512, activation='linear', use_bias=False),
        tf.keras.layers.Dense(constants.team_vector_size, activation='linear', use_bias=False)
    ])

    return model


def generate_defense_vectorizer():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(len(load.team_indices), activation='linear', use_bias=False),
        tf.keras.layers.Dense(512, activation='linear', use_bias=False),
        tf.keras.layers.Dense(constants.team_vector_size, activation='linear', use_bias=False)
    ])

    return model


def generate_mean_predictor():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(constants.team_vector_size * 2 + constants.meta_vector_size, activation='linear'),
        tf.keras.layers.Dense(1024, activation='leaky_relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(512, activation='leaky_relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(256, activation='leaky_relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(128, activation='leaky_relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(constants.outputs * 3, activation='linear'),
        tfp.layers.DistributionLambda(lambda t: tfp.distributions.TwoPieceNormal(loc=t[:, :constants.outputs], scale=0.01 + tf.math.softplus(0.01 * t[:, constants.outputs:constants.outputs * 2]), skewness=tf.exp(0.01 * t[:, constants.outputs * 2:constants.outputs * 3])))
    ])

    return model


class Predictor(tf.keras.models.Model):
    def __init__(self):
        super(Predictor, self).__init__()   
        self.offense_vectorizer = generate_offense_vectorizer()
        self.defense_vectorizer = generate_defense_vectorizer()
        self.mean_predictor = generate_mean_predictor()

        self.compile(optimizer=tf.optimizers.Adam(0.00005), loss=self.loss)


    def loss(self, y, model_y):
        return -model_y.log_prob(y)# * y?


    def call(self, x, training):
        offense_vector = self.offense_vectorizer(x[:, 0], training)
        defense_vector = self.defense_vectorizer(x[:, 1], training)

        match_vector = tf.concat([offense_vector, defense_vector, x[:, 2, :constants.meta_vector_size]], 1)

        prediction = self.mean_predictor(match_vector, training)
        return prediction


    def save(self):
        self.offense_vectorizer.save_weights(constants.model_location + '/offense_vectorizer/model')
        self.defense_vectorizer.save_weights(constants.model_location + '/defense_vectorizer/model')
        self.mean_predictor.save_weights(constants.model_location + '/mean_predictor/model')


    def load(self):
        self.offense_vectorizer.load_weights(constants.model_location + '/offense_vectorizer/model')
        self.defense_vectorizer.load_weights(constants.model_location + '/defense_vectorizer/model')
        self.mean_predictor.load_weights(constants.model_location + '/mean_predictor/model')