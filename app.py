import datetime
import json
import random
import string
from pip import main
from flask import Flask, render_template, request, make_response
import boto3
import os
import transcribe as ts
from flask_cors import CORS
import time
import shutil

from moviepy.editor import *
import regex
import cv2

bucket_name = os.environ.get("bucket_name")
ACCESS_KEY = os.environ.get("ACCESS_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY")

REGION = 'us-east-1'

s3_client = boto3.client(
    's3',
    region_name=REGION,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
)

app = Flask(__name__, static_url_path='/static')
CORS(app)

@app.route('/upload')
def aws_trancribe():
    return render_template('upload.html')

@app.route('/compare')
def compare_tool():
    return render_template('compare.html')

@app.route('/start_transcribe', methods=["POST"])
def start_transcribe():
    json_body = request.get_json()
    video_id = json_body['video_id']
    filename = json_body['filename']
    language = json_body['language']
    job_id = video_id
    return ts.create_transcribe_job(job_id, video_id, filename, language)

@app.route('/get_transcribe_results', methods=["POST"])
def get_transcribe_results():
    json_body = request.get_json()
    job_id = json_body['job_id']
    file = json_body['file']
    return ts.get_transcribe_result(job_id, file)

#Get S3 Signed URLs
@app.route("/get_signed_s3_urls", methods=["POST"])
def get_signed_s3_urls():
    json_body = request.get_json()
    #content = request.json
    response = create_presigned_url(json_body['video_id'],json_body['filename'])
    return response

def create_presigned_url(video_id, object):
    try:
        key = object
        key = '{}/{}'.format(video_id,key)
        print(key)
        url = s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={'Bucket': bucket_name, 'Key': key },
                ExpiresIn=600000,
            )
        print("signed url: ",url)
                        
    except boto3.ClientError as e:
        print(e)
        return None
    return url  


@app.route("/yes_no_files", methods=['POST'])
def yes_no_files():
    json_body = request.get_json()
    yes_dict = json_body['yes_dict']
    no_dict = json_body['no_dict']
    text_type = json_body['text_type']

    if(text_type == "word"):
        os.mkdir('yes_files_word')
        os.mkdir('no_files_word')
        os.mkdir('split_by_letters')
        os.mkdir('split_by_letters/frames')
        count = 0

        for yes in yes_dict:
            yes_key = yes['key']
            yes_value = yes['value']
            shutil.copy("static/videos/"+yes_key, 'yes_files_word/'+yes_value+".mp4")

            cap = cv2.VideoCapture('yes_files_word/'+yes_value+".mp4")
            fourcc = cv2.VideoWriter_fourcc(*'MP4V')
            cap_width = int(cap.get(3))
            cap_height = int(cap.get(4))
            fps = cap.get(cv2.CAP_PROP_FPS)
            approx_frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            print("Total frames: {}".format(approx_frame_count))

            for text in [yes_value.encode('utf-8')]:
                letter_lst = regex.findall(r'\X', text.decode("utf-8"), regex.U)
                letter_len = len(letter_lst)
                split_time = approx_frame_count / letter_len

                for lett in letter_lst:
                    running = True
                    frame_counter = 1
                    if not os.path.exists('split_by_letters/frames/'+ lett):
                        os.mkdir('split_by_letters/frames/'+ lett)
                        out = cv2.VideoWriter("split_by_letters/" + lett + ".mp4", fourcc, fps, (cap_width, cap_height))

                        while running:
                            ret, frame = cap.read()
                            cv2.imwrite("split_by_letters/frames/%s/%d.jpg" % (lett,frame_counter), frame)
                            image = cv2.imread(os.path.join("split_by_letters/frames/%s/%d.jpg" % (lett,frame_counter)))
                            
                            out.write(image)
                            frame_counter = frame_counter + 1  
                            if(frame_counter > split_time):
                                running = False
                                out.release()

                    else:
                        count = count + 1
                        os.mkdir('split_by_letters/frames/'+ lett+'_'+str(count))
                        out = cv2.VideoWriter("split_by_letters/" + lett + '_' + str(count) + ".mp4", fourcc, fps, (cap_width, cap_height))

                        while running:
                            ret, frame = cap.read()
                            cv2.imwrite("split_by_letters/frames/%s_%s/%d.jpg" % (lett,str(count),frame_counter), frame)
                            image = cv2.imread(os.path.join("split_by_letters/frames/%s_%s/%d.jpg" % (lett,str(count),frame_counter)))

                            out.write(image)
                            frame_counter = frame_counter + 1  
                            if(frame_counter > split_time):
                                running = False
                                out.release()



        for no in no_dict:
            no_key = no['key']
            no_value = no['value']
            shutil.copy("static/videos/"+no_key, 'no_files_word/'+no_value+".mp4")


    elif(text_type == "letter"):
        os.mkdir('yes_files_letter')
        os.mkdir('no_files_letter')

        for yes in yes_dict:
            yes_key = yes['key']
            yes_value = yes['value']
            shutil.copy("static/videos/"+yes_key, 'yes_files_letter/'+yes_value+".mp4")

        for no in no_dict:
            no_key = no['key']
            no_value = no['value']
            shutil.copy("static/videos/"+no_key, 'no_files_letter/'+no_value+".mp4")



# @app.route("/upload", methods=['POST'])
# def upload_file():
#     file_to_upload = request.files['file'].read()
#     filename= request.form["filename"]
#     print("filename::",filename)
#     with open(filename, 'wb') as f: 
#         f.write(file_to_upload)
#     o = open(filename, "r")
#     return get_transcribe_result("job_id", filename, o)

if __name__ == '__main__':
    app.run(port=8080, debug=True)
