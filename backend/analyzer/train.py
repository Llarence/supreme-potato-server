import tensorflow as tf
import random

try:
    from . import load, models, constants
except:
    import load, models, constants

predictor = models.Predictor()
# predictor.load()

x = []
y = []
for match_num, match in enumerate(load.matches):
    print('\u001b[2K\r{:.2f}%'.format(match_num / len(load.matches) * 100), end='', flush=True)
    
    blue, red = load.match_to_tensors(match)

    x.append(blue[0])
    y.append(blue[1])

    x.append(red[0])
    y.append(red[1])

print('\u001b[2K\r100.00%')

zipped = list(zip(x, y))
random.shuffle(zipped)
x, y = zip(*zipped)

x = tf.stack(x)
y = tf.stack(y)

x_train = x[constants.test_size:]
y_train = y[constants.test_size:]

x_test = x[:constants.test_size]
y_test = y[:constants.test_size]

train_data = tf.data.Dataset.from_tensor_slices((x_train, y_train))
train_data = train_data.shuffle(buffer_size=1024, reshuffle_each_iteration=True)
train_data = train_data.batch(1024).prefetch(tf.data.experimental.AUTOTUNE)
test_data = tf.data.Dataset.from_tensor_slices((x_test, y_test))
test_data = test_data.shuffle(buffer_size=1024, reshuffle_each_iteration=True)
test_data = test_data.batch(1024).prefetch(tf.data.experimental.AUTOTUNE)

try:
    predictor.fit(train_data, epochs=10000, validation_data=test_data, callbacks=tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True))
finally:
    predictor.save()