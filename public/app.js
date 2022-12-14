// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let connection = new TikTokIOConnection(backendUrl);

// Counter
let viewerCount = 0;
let likeCount = 0;
let diamondsCount = 0;
let countTimer = 0;

// These settings are defined by obs.html
if (!window.settings) window.settings = {};

$(document).ready(() => {
    $('#connectButton').click(connect);
    $('#userToConnect').on('keyup', function (e) {
        if (e.key === 'Enter') {
            connect();
        }
    });

    if (window.settings.username) connect();

    let startTimer = document.querySelector("#startTimer");
    let valueStartTimer = document.querySelector("#valueStartTimer");
    
    startTimer.addEventListener("click", function () {
        countTimer = Math.floor(Date.now() / 1000);

        addTimeToCounter(valueStartTimer.value * 60);
        $("#boxTimer").hide();
        
        timer_1_second();
    });
});

function connect() {
    let uniqueId = window.settings.username || $('#userToConnect').val();
    if (uniqueId !== '') {

        $('#stateText').text('Conectando...');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: true
        }).then(state => {
            $('#stateText').text(`Conectado al roomId ${state.roomId}`);
            $("#div_userToConnect").hide();
            $("#div_stateText").hide();

            // reset stats
            viewerCount = 0;
            likeCount = 0;
            diamondsCount = 0;
            updateRoomStats();

        }).catch(errorMessage => {
            $('#stateText').text(errorMessage);

            // schedule next try if obs username set
            if (window.settings.username) {
                setTimeout(() => {
                    connect(window.settings.username);
                }, 30000);
            }
        })

    } else {
        alert('No se ingresó usuario');
    }
}

function addTimeToCounter(value){
    countTimer += value;
    console.log("ADD _ " + value);
    writeNewNumber(countTimer);
}

function delTimeToCounter(value){
    countTimer -= value;
    console.log("DEL _ " + value);
    writeNewNumber(countTimer);
}

function H_M_S(value){
    const h = Math.floor(value / 3600).toString().padStart(2,'0');
    const m = Math.floor(value % 3600 / 60).toString().padStart(2,'0');
    const s = Math.floor(value % 60).toString().padStart(2,'0');

    if (value < 0){
        return 'Finalizado!'
    } else if (value < 300) {
        return '<span style="color:red;">' + h + ':' + m + ':' + s + '</span></br>&#127937; ' + timeConverter(countTimer);
    } else {
        return h + ':' + m + ':' + s + '</br>&#127937; ' + timeConverter(countTimer);
    }
}

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' '
            + (hour < 10 ? '0' + hour : hour) + ':'
            + (min < 10 ? '0' + min : min) + ':'
            + (sec < 10 ? '0' + sec : sec);
    return time;
}

function writeNewNumber(value){
    let HTML_countTimer = document.querySelector("#counterTimer");
    HTML_countTimer.innerHTML = `<b>${H_M_S(value - Math.floor(Date.now() / 1000))}</b>`;
}

function timer_1_second(){
    writeNewNumber(countTimer);
    setTimeout(() => {
        //console.log("Delayed for 1 second.");
        timer_1_second();
      }, "1000");
}

// Prevent Cross site scripting (XSS)
function sanitize(text) {
    return text.replace(/</g, '&lt;')
}

function updateRoomStats() {
    $('#roomStats').html(`Personas &#128100;: <b>${viewerCount.toLocaleString()}</b> — Likes &#10084;&#65039;: <b>${likeCount.toLocaleString()}</b>`);
}

function generateUsernameLink(data) {
    return `<a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.uniqueId}</a>`;
}

function isPendingStreak(data) {
    return data.giftType === 1 && !data.repeatEnd;
}

/**
 * Add a new message to the chat container
 */
function addChatItem(color, data, text, summarize) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.chatcontainer');

    if (container.find('div').length > 500) {
        container.find('div').slice(0, 200).remove();
    }

    container.find('.temporary').remove();;

    container.append(`
        <div class=${summarize ? 'temporary' : 'static'}>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            <span>
                <b>${generateUsernameLink(data)}:</b> 
                <span style="color:${color}">${sanitize(text)}</span>
            </span>
        </div>
    `);

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 400);
}

/**
 * Add a new gift to the gift container
 */
function addGiftItem(data) {
    let container = location.href.includes('obs.html') ? $('.eventcontainer') : $('.giftcontainer');

    if (container.find('div').length > 200) {
        container.find('div').slice(0, 100).remove();
    }

    let streakId = data.userId.toString() + '_' + data.giftId;

    if (!isPendingStreak(data)){
        playAudio(data);
    }

    let html = `
        <div data-streakid=${isPendingStreak(data) ? streakId : ''}>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            <span>
                <b>${generateUsernameLink(data)}</b>: <span>${data.describe}</span><br>
                <div>
                    <table>
                        <tr>
                            <td><img class="gifticon" src="${data.giftPictureUrl}"></td>
                            <td>
                                <span><b>${data.giftName}</b> <b style="${isPendingStreak(data) ? 'color:red' : ''}">x${data.repeatCount.toLocaleString()}</b><span><br>
                                <span>Costo: <b>${(data.diamondCount * data.repeatCount).toLocaleString()} monedas</b><span>
                            </td>
                        </tr>
                    </tabl>
                </div>
            </span>
        </div>
    `;

    let existingStreakItem = container.find(`[data-streakid='${streakId}']`);

    if (existingStreakItem.length) {
        existingStreakItem.replaceWith(html);
    } else {
        container.append(html);
    }

    container.stop();
    container.animate({
        scrollTop: container[0].scrollHeight
    }, 800);
}

function playAudio(data){

    if (data.giftName == 'Soccer' && data.repeatCount >= 1){ //Aguantes son 3x pelotas de futbol
        let soundFile = new Audio('sounds/aguante_boca.mp3');
        soundFile.play();
    } else if (data.giftName == 'Wishing Bottle' && data.repeatCount >= 1){ //Aguantaaaa son 3x frascos 
        let soundFile = new Audio('sounds/aguanta.mp3');
        soundFile.play();
    } else if (data.giftName == 'Ice Cream Cone' && data.repeatCount >= 1){ //me pican los coco son 3x helados 
        let soundFile = new Audio('sounds/me_pican_cocos.mp3');
        soundFile.play();
    } else if (data.giftName == 'Tennis' && data.repeatCount >= 1){ //risa de ardilla son 3x tenis
        let soundFile = new Audio('sounds/risa_ardilla.mp3');
        soundFile.play();
    } else if (data.giftName == 'GG' && data.repeatCount >= 1){ //Vamos son 3x gg
        let soundFile = new Audio('sounds/Vamos.mp3');
        soundFile.play();
    } else if (data.giftName == 'TikTok' && data.repeatCount >= 1){ //helaos de cien son 3x tik tok
        let soundFile = new Audio('sounds/cuanto_valen_sien.mp3');
        soundFile.play();
    } else if (data.giftName == 'Mic' && data.repeatCount >= 1){ //el Boca sho te amo son 1x microfono
        let soundFile = new Audio('sounds/Boca sho te amo.mp3');
        soundFile.play();
    } else if (data.giftName == 'Gamepad' && data.repeatCount >= 1){ //que pro son 1x gamepad
        let soundFile = new Audio('sounds/que pro.mp3');
        soundFile.play();
    } else if (data.giftName == 'Cat Paws' && data.repeatCount >= 1){ //Cosas que poca gente sabe 1x cat paws
        let soundFile = new Audio('sounds/Cosas que poca gente sabe.mp3');
        soundFile.play();
    } else if (data.giftName == 'Weights' && data.repeatCount >= 1){ //patito onichan 1x Weights  
        let soundFile = new Audio('sounds/patito onichan.mp3');
        soundFile.play();
    } else if (data.giftName == 'Mate tea' && data.repeatCount >= 1){ //YA BASTA FREEZER 1x Mate
        let soundFile = new Audio('sounds/YA BASTA FREEZER.mp3');
        soundFile.play();
    } else if (data.giftName == 'Panda' && data.repeatCount >= 1){ //aguante lanuh 1x panda
        let soundFile = new Audio('sounds/aguante lanuh.mp3');
        soundFile.play();
    } else if (data.giftName == 'Heart' && data.repeatCount >= 1){ //baja cagón baja 1x heart
        let soundFile = new Audio('sounds/baja cagón baja.mp3');
        soundFile.play();
    } else if (data.giftName == 'Nachos' && data.repeatCount >= 1){ //Chrissy wake up 1x nachos
        let soundFile = new Audio('sounds/Chrissy wake up.mp3');
        soundFile.play();
    } else if (data.giftName == 'Mini Speaker' && data.repeatCount >= 1){ //peladin 1x parlantes
        let soundFile = new Audio('sounds/peladin.mp3');
        soundFile.play();
    } else if (data.giftName == 'Finger Heart' && data.repeatCount >= 1){ //vamo newells 1x Finger Heart
        let soundFile = new Audio('sounds/vamo newells.mp3');
        soundFile.play();
    } else if (data.giftName == 'Rose' && data.repeatCount >= 1){ //no hay problema willy 1x rose
        let soundFile = new Audio('sounds/no hay problema willy.mp3');
        soundFile.play();
        addTimeToCounter(data.repeatCount);
    } else if (data.giftName == 'Lollipop' && data.repeatCount >= 1){ //Los huevos de pascua 1x Lollipop 
        let soundFile = new Audio('sounds/Los huevos de Pascua de San Andreas.mp3');
        soundFile.play();
    } else if (data.giftName == 'Guacamole' && data.repeatCount >= 1){ //encara messi 1x guacamole 
        let soundFile = new Audio('sounds/Encara messi.mp3');
        soundFile.play();
    } else if (data.giftName == 'Hand Wave' && data.repeatCount >= 1){ //Esto se va a descontrolar 1x Hand Wave 
        let soundFile = new Audio('sounds/Esto se va a descontrolar.mp3');
        soundFile.play();
    } else if (data.giftName == 'Maracas' && data.repeatCount >= 1){ //A ver a ver que paso 1x Hand Wave 
        let soundFile = new Audio('sounds/a ver a ver que paso.mp3');
        soundFile.play();
    }
}

// viewer stats
connection.on('roomUser', (msg) => {
    if (typeof msg.viewerCount === 'number') {
        viewerCount = msg.viewerCount;
        updateRoomStats();
    }
})

// like stats
connection.on('like', (msg) => {
    if (typeof msg.totalLikeCount === 'number') {
        likeCount = msg.totalLikeCount;
        updateRoomStats();
    }

    if (window.settings.showLikes === "0") return;

    if (typeof msg.likeCount === 'number') {
        addChatItem('#447dd4', msg, msg.label.replace('{0:user}', '').replace('likes', `${msg.likeCount} likes`))
    }
})

// Member join
let joinMsgDelay = 0;
connection.on('member', (msg) => {
    if (window.settings.showJoins === "0") return;

    let addDelay = 250;
    if (joinMsgDelay > 500) addDelay = 100;
    if (joinMsgDelay > 1000) addDelay = 0;

    joinMsgDelay += addDelay;

    setTimeout(() => {
        joinMsgDelay -= addDelay;
        addChatItem('#21b2c2', msg, 'joined', true);
    }, joinMsgDelay);
})

// New chat comment received
connection.on('chat', (msg) => {
    if (window.settings.showChats === "0") return;

    addChatItem('', msg, msg.comment);
})

// New gift received
connection.on('gift', (data) => {
    if (!isPendingStreak(data) && data.diamondCount > 0) {
        diamondsCount += (data.diamondCount * data.repeatCount);
        updateRoomStats();
    }

    if (window.settings.showGifts === "0") return;

    addGiftItem(data);
})

// share, follow
connection.on('social', (data) => {
    if (window.settings.showFollows === "0") return;

    let color = data.displayType.includes('follow') ? '#ff005e' : '#2fb816';
    addChatItem(color, data, data.label.replace('{0:user}', ''));
})

connection.on('streamEnd', () => {
    $('#stateText').text('Stream ended.');

    // schedule next try if obs username set
    if (window.settings.username) {
        setTimeout(() => {
            connect(window.settings.username);
        }, 30000);
    }
})