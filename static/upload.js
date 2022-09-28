
var video_id;
var upload_file;
let video2;

const video_scr = document.createElement('video');
const poster1 = document.createElement('video');
const final_poster = document.createElement('video');

video_scr.controls = true;
video_scr.height = 500;
video_scr.width = 800;
video_scr.position = "relative";
video_scr.style.margin = "50px 80px";
video_scr.style.padding = "5px";

poster1.height = 500;
poster1.width = 800;
poster1.position = "relative";
poster1.style.margin = "50px 80px";
poster1.style.padding = "5px";

final_poster.height = 500;
final_poster.width = 800;
final_poster.position = "relative";
final_poster.style.margin = "50px 80px";
final_poster.style.padding = "5px";

const box = document.getElementById('play_video');
box.appendChild(video_scr);

function enterName() {
    if (document.getElementById("fname").value != "") {
        document.getElementById('upload-s3').style.display = "none";
        document.getElementById("loader").style.display = "block";
        video2.muted = true;
        video2.controls = false;
        video2.remove();
        box.appendChild(poster1);
        poster1.poster =
            'https://st.depositphotos.com/2075661/2503/v/450/depositphotos_25033791-stock-illustration-please-wait.jpg';

        video_id = generateID();
        console.log(video_id);

        var blob = upload_file.slice(0, upload_file.size, 'video/mp4');
        var rename_file = new File([blob], video_id + '.mp4');

        // const formData = new FormData();
        // formData.append("file", upload_file);
        // formData.append("filename", upload_file.name);
        // const options = {
        //     method: "POST",
        //     body: formData,
        // };

        // fetch("/upload", options)
        //     .then((response) => {
        //         return response.json();
        //     })
        //     .then((data) => {
        //         console.log(data);
        //     })
        //     .catch((error) => {
        //         console.log(error);
        //     });


        doS3Upload(video_id, rename_file);

        
    } else {
        alert("Please enter your name");
    }
}


$("#upload-button").click(function () {
    $("#upload").click();
});

$('#upload').change(function () {
    document.getElementById("upload").disabled = true;

    upload_file = document.getElementById('upload').files[0];
    let videoMetaData = (upload_file) => {
        return new Promise(function (resolve, reject) {
            video2 = document.createElement('video');
            video2.addEventListener('canplay', function () {
                resolve({
                    video: video2,
                    // duration: Math.round(video.duration * 1000),
                    height: video2.videoHeight,
                    width: video2.videoWidth
                });
            });
            video_scr.remove();
            video2.src = URL.createObjectURL(upload_file);
            document.body.appendChild(video2);
            video2.style.display = "block";
            video2.muted = false;
            video2.play();
            video2.controls = true;

            video2.autoplay = false;
            video2.height = 500;
            video2.width = 800;
            video2.position = "relative";
            video2.style.margin = "50px 80px 100px 500px";
            video2.style.padding = "5px";
            document.getElementById('upload-s3').style.display = "block";
        })
    }

    videoMetaData($('#upload')[0].files[0]).then(function (value) {
    })
});


function generateID() {
    var user_name = document.getElementById('fname').value;

    var i, key = "", characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var charactersLength = characters.length;
    for (i = 0; i < 10; i++) {
        key += characters.substr(Math.floor((Math.random() * charactersLength) + 1), 1);
    }
    var id = new Date().toISOString().slice(0, 10).replace(/-/g, "") + '-' + user_name + '-' + key;
    return id;
};

async function doS3Upload(video_id, file) {
    console.log(file.name);
    console.log(video_id);
    const { data } = await axios.post("/get_signed_s3_urls", {
        video_id: video_id,
        filename: file.name,
        contentType:
            "text/json"
    });

    const response = await axios({
        url: data,
        method: "put",
        data: file,
        headers: { "Content-Type": file.type },
        maxContentLength: (100 * 1024 * 1024 * 1024),
        timeout: (30 * 60 * 1000),//30mins
        onUploadProgress: (pevt) => {
            console.log("uploaded.:" + Math.round((pevt.loaded / pevt.total) * 100));

            if ((pevt.loaded / pevt.total) == 1) {
                start_transcribe(video_id, file);
            }
        }
    });
};

async function start_transcribe(video_id, file) {
    var e = document.getElementById("lang");
    var lang = e.options[e.selectedIndex].text;

    if (lang == "tamil") {
        lang_code = 'ta-IN';
    }
    else if (lang == "telugu") {
        lang_code = 'te-IN';
    }

    try {
        var resp = axios.post("/start_transcribe", {
            video_id: video_id,
            filename: file.name,
            language: lang_code,
            contentType:
                "text/json"
        });
        console.log(resp);

        resp.then(job_name => {
            console.log('job_id ==>>>>', job_name);
            myVar = setInterval(function () {
                const d = new Date();
                console.log('Waiting for results for 20s');
                console.log(d.toLocaleTimeString());
                job_id = job_name['data'];
                console.log('job_id  ##', job_id);
                var transcribe_status = get_transcribe_results(job_id, upload_file);
            }, 20000);
        });

    } catch (err) {
        console.log('ERROR while creating transcribe job', err);
        return 'Error';
    }
};

var postJSON = function (url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onload = function () {
        var status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send(JSON.stringify(data));
}

var getJSON = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
        var status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send();
};

var time_text_dict = [];

function get_transcribe_results(job_id, file) {
    var input_data = {
        job_id: job_id,
        file: file.name,
        contentType:
            "text/json"
    };

    postJSON("/get_transcribe_results", input_data,
        function (err, result) {
            if (err !== null) {
                console.log('Something went wrong: ' + err);
                return "error";
            } else {
                var res_json = JSON.parse(result);
                console.log('Your transcribe result is : ' + res_json["status"]);

                var transcript_status = res_json["status"];
                if (transcript_status == 'failed') {
                    clearInterval(myVar);
                    console.log("Failed to process transcription.Please re-upload the video.");
                }

                else if (transcript_status == 'pending') {
                    return "pending";
                }

                else {
                    console.log("Transcribe & chopping completed");
                    alert("Transcribe & chopping part completed");

                    document.getElementById("loader").style.display = "none";
                    poster1.remove();
                    box.appendChild(final_poster);
                    final_poster.poster =
                        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTK2-O4BKw5Kv3GTdRC90dm8uEfmr4Ky9zRaw&usqp=CAU';

                    // var transcript_text = '';
                    // var transcript_json = res_json['transcript_json'];
                    // var transcript_json1 = JSON.parse(transcript_json);
                    // var transcript_result = transcript_json1['results'];

                    // if (transcript_result != null) {
                    //     console.log('transcript_result :::', transcript_result);

                    //     var transcripts = transcript_result['transcripts'];
                    //     if (transcripts.length > 0) {
                    //         transcript_text = transcripts[0]['transcript'];
                    //         console.log('Transcript Text only :::', transcript_text);
                    //     }
                    //     var transcript_items = transcript_result['items'];

                    //     for (index in transcript_items) {
                    //         var tr_item = transcript_items[index];

                    //         if (tr_item.type == 'pronunciation') {
                    //             var alternatives = tr_item['alternatives'];

                    //             if (alternatives.length > 0) {
                    //                 var word = alternatives[0]['content'];

                    //                 time_text_dict.push({
                    //                     key: word,
                    //                     value: [tr_item['start_time'], tr_item['end_time']]
                    //                 });

                    //             }
                    //         }
                    //     }
                    // }
                    // console.log("time_text_dict", time_text_dict);
                    clearInterval(myVar);
                }
            }
        });
}