let user_name = localStorage.getItem('name');
let current_channel = localStorage.getItem('channel');
let user_id = localStorage.getItem('id');
let socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

function load_channel(ch_name)
{
    if (ch_name == null)
        ch_name = 'general';
    current_channel = ch_name;
    document.querySelector('#cur_channel_name').innerHTML = ch_name;
    localStorage.setItem('channel', ch_name);

    socket.emit('load channel', ch_name);
}

function bindChannelToButton(button) 
{
    button.onclick = () => {
        load_channel(button.dataset.channel_name);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    load_channel(current_channel);
    //if user logged in, show messages. Otherwise, ask to enter username
    if (user_id == null) {
        document.querySelector('#name_input').style.display = 'block';
        document.querySelector('#logged_in').style.display = 'none';
        socket.emit('get id');
    }
    else {
        document.querySelector('#name_input').style.display = 'none';
        document.querySelector('#logged_in').style.display = 'block';
        document.querySelector('#test').innerHTML = user_name;
        document.querySelector('title').innerHTML = 'Messages';
    }

    //save username and show messages
    document.querySelector('#name_form').onsubmit = () => {
        user_name = document.querySelector('#name').value;
        localStorage.setItem('name', user_name);    
        document.querySelector('#name_input').style.display = 'none';
        document.querySelector('#logged_in').style.display = 'block';
        document.querySelector('#test').innerHTML = user_name;
        document.querySelector('title').innerHTML = 'Messages';
        document.querySelector('#name').value = '';
        return false;
    }

    //change display name
    document.querySelector('#change_name').onclick = () => {
        document.querySelector('#name_input').style.display = 'block';
        document.querySelector('#logged_in').style.display = 'none';
        document.querySelector('title').innerHTML = 'Enter display name';
    }

    //create new channel
    document.querySelector('#new_channel').onsubmit = () => {
        let channel_name = document.querySelector('#channel_name').value;
        socket.emit('new channel', channel_name);
        document.querySelector('#channel_name').value = '';
        return false;
    }

    //when new channel is created, add it to the list
    socket.on('channel created', ch_name => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.setAttribute('class', 'channel_select');
        button.setAttribute('data-channel_name', ch_name);
        button.innerHTML = ch_name;
        bindChannelToButton(button);
        li.appendChild(button);
        document.querySelector('#channels').append(li);
    })

    socket.on('channel exists', channel_name => {
        alert(`Channel '${channel_name}' already exists!`);
    })

    document.querySelectorAll('.channel_select').forEach(bindChannelToButton);

    //send new message
    document.querySelector('#new_message').onsubmit = () => {
        message = document.querySelector('#message').value;
        if (message == '') {
            alert('Message is empty');
            return false;
        }

        socket.emit('new message', {'text': message, 'user': user_name, 'channel': current_channel, 'uid': user_id, 'time': Date.now()});
        document.querySelector('#message').value = '';
        return false;
    }

    //receive message
    socket.on('new message', ch_name => {
        if (ch_name == current_channel)
            load_channel(current_channel);
    })

    //get channel messages
    socket.on('channel', data => {
        document.querySelector('#message_list').innerHTML = '';
        for (let i = 0; i < data.length; i++) {
            const div = document.createElement('div');
            div.setAttribute('class', 'message');

            //meta contains username, timestamp and delete button
            const meta = document.createElement('p');
            meta.setAttribute('class', 'meta');
            meta.innerHTML = `${data[i]['user']} on ${data[i]['time']}:`;
            if (data[i]['uid'] == user_id) {
                const delete_btn = document.createElement('button');
                delete_btn.innerHTML = 'Delete';
                delete_btn.onclick = () => {
                    socket.emit('delete message', {'mid': data[i]['mid'], 'channel': current_channel});
                }
                meta.appendChild(delete_btn);
            }
            div.appendChild(meta);

            const msg_body = document.createElement('p');
            msg_body.innerHTML = data[i]['text'];
            div.appendChild(msg_body);
            document.querySelector('#message_list').appendChild(div);
        }
    })

    socket.on('invalid channel', ch_name => {
        alert(`Channel '${ch_name}'' does not exist`);
        load_channel(null);
    })

    //save user id
    socket.on('id', id => {
        user_id = id;
        localStorage.setItem('id', id);
    })
})