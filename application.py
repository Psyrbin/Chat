import os
import datetime

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# list of all channels
channels = {'general': []}

max_id = 0
#max_id is stored in a file to prevent new users from getting id that belongs to someone else after restart of the application
if os.path.isfile('id'):
    with open('id', 'r') as id_file:
        max_id = int(id_file.read())

message_count = 0


@app.route("/")
def index():
    return render_template('index.html', channels = channels)

#create new channel
@socketio.on('new channel')
def create_chnnel(channel_name):
    if channel_name in channels:
        emit('channel exists', channel_name, broadcast=False)
    else:
        channels[channel_name] = []
        emit('channel created', channel_name, broadcast=True)

#send new message
@socketio.on('new message')
def new_message(data):
    global message_count
    message = {'user': data['user'], 'text': data['text'], 'uid': data['uid'], 'mid': message_count, 'time': datetime.datetime.fromtimestamp(data['time'] / 1000).strftime('%Y-%m-%d %H:%M:%S')}
    message_count += 1
    channels[data['channel']].append(message)
    channels[data['channel']] = channels[data['channel']][-100:]
    emit('new message', data['channel'], broadcast=True)


@socketio.on('load channel')
def send_channel(ch_name):
    if ch_name in channels:
        emit('channel', channels[ch_name])
    else:
        emit('invalid channel', ch_name)

#give new user id
@socketio.on('get id')
def new_user():
    global max_id
    emit('id', max_id, broadcast=False)
    max_id += 1
    with open('id', 'w') as id_file:
        id_file.write(str(max_id))

#delete message
@socketio.on('delete message')
def delete_message(data):
    for message in channels[data['channel']]:
        if message['mid'] == data['mid']:
            channels[data['channel']].remove(message)
            emit('new message', data['channel'], broadcast=True)
            break