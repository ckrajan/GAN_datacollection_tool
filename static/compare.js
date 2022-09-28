var video_list;
var files;
var count = 0;
var vid_start_count;

document.getElementById("folder").addEventListener("change", function (event) {
    // var output = document.querySelector("ul");
    files = event.target.files;
    video_list = files.length;
    for (count = 0; count <= video_list; count++) {
        if (files[count].type == "video/mp4") {
            vid_start_count = count;
            video.src = files[count].webkitRelativePath;
            document.getElementById("transcribe_txt").innerHTML = files[count].name.replace('.mp4', '');
            break;
        }
    }
    document.getElementById("video_count").innerHTML = parseInt((count + 1) - vid_start_count) + " Out of" + " " + parseInt(video_list - vid_start_count) + " videos";

}, false);

const video = document.createElement('video');
const poster1 = document.createElement('video');
// video.poster =
//   'https://pbs.twimg.com/profile_images/1076488288658120705/p5D676cI_400x400.jpg';

video.autoplay = true;
video.controls = true;
video.muted = false;
video.height = 500;
video.width = 800;
video.position = "relative";
video.style.margin = "50px 80px";
video.style.padding = "5px";

poster1.height = 500;
poster1.width = 800;
poster1.position = "relative";
poster1.style.margin = "50px 80px";
poster1.style.padding = "5px";

const box = document.getElementById('play_video');
box.appendChild(video);

function next_vid() {
    count++;
    document.getElementById("video_count").innerHTML = parseInt((count + 1) - vid_start_count) + " Out of" + " " + parseInt(video_list - vid_start_count) + " videos";

    if (count < video_list) {
        video.src = files[count].webkitRelativePath;
        document.getElementById("transcribe_txt").innerHTML = files[count].name.replace('.mp4', '');
        video.load();
        // video.play();
    }
    else {
        video.muted = true;
        video.controls = false;
        video.remove();
        box.appendChild(poster1);
        poster1.poster =
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTK2-O4BKw5Kv3GTdRC90dm8uEfmr4Ky9zRaw&usqp=CAU';
        document.getElementById("transcribe_txt").style.display = "none";
        document.getElementById("yes-button").style.display = "none";
        document.getElementById("no-button").style.display = "none";
        document.getElementById("video_count").style.display = "none";
    }
}

var yes_dict = [];
var no_dict = [];
var node = document.getElementById('transcribe_txt');

function yesButton() {
    yes_dict.push({
        key: files[count].name,
        value: textContent = node.textContent
    });

    next_vid();
}

function noButton() {
    no_dict.push({
        key: files[count].name,
        value: textContent = node.textContent
    });

    next_vid();
}

// function processButton() {
//     console.log("yes_dict", yes_dict);
//     console.log("no_dict", no_dict);
// }


async function processButton() {

    var e = document.getElementById("txt_type");
    var text = e.options[e.selectedIndex].text;

    console.log("yes_dict", yes_dict);
    console.log("no_dict", no_dict);
    const { data } = await axios.post("/yes_no_files", {
        yes_dict: yes_dict,
        no_dict: no_dict,
        text_type: text,
        contentType:
            "text/json"
    });
};
