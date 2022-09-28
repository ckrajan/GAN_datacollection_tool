# import boto3
# from urllib.request import urlopen
# import json
# import os

# bucket_name = os.environ.get("bucket_name")
# ACCESS_KEY = os.environ.get("ACCESS_KEY")
# SECRET_KEY = os.environ.get("SECRET_KEY")
# REGION = 'us-east-1'

# s3_client = boto3.client(
#     's3',
#     region_name=REGION,
#     aws_access_key_id=ACCESS_KEY,
#     aws_secret_access_key=SECRET_KEY,
# )

# aws_session  = boto3.Session( aws_access_key_id=ACCESS_KEY,
#                             aws_secret_access_key=SECRET_KEY, 
#                             )
# #aws_session = input_dict['aws_session']
# transcribe_client = aws_session.client('transcribe', region_name='us-east-1')

# def create_transcribe_job(job_name, video_id, filename):
#     file_uri = 's3://{}/{}/{}'.format(bucket_name, video_id, filename )

#     transcribe_client.start_transcription_job(
#         TranscriptionJobName=job_name,
#         Media={'MediaFileUri': file_uri},
#         MediaFormat='mp4',
#         LanguageCode='ta-IN'
#     )
#     return  job_name

# def get_transcribe_result(job_name):
#     job = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
#     job_status = job['TranscriptionJob']['TranscriptionJobStatus']
#     if job_status in ['COMPLETED', 'FAILED']:
#         print(f"Job {job_name} is {job_status}.")
#         if job_status == 'COMPLETED':
#             json_response = urlopen(job['TranscriptionJob']['Transcript']['TranscriptFileUri']).read()
#             json_data = json.loads(json_response)
#             print(json_data)
#             return {"status":"completed" , "transcript_json":json.dumps(json_data)}
#         else:
#             return {"status":"failed"}
#     else:
#         print("Waiting for {job_name}. Current status is {job_status}.")
#         return {"status":"pending"}        


###########################


import boto3
from urllib.request import urlopen
import json
import os

import datetime
from moviepy.editor import *

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

aws_session  = boto3.Session( aws_access_key_id=ACCESS_KEY,
                            aws_secret_access_key=SECRET_KEY, 
                            )
#aws_session = input_dict['aws_session']
transcribe_client = aws_session.client('transcribe', region_name='us-east-1')


def get_sec(time_str):
    """Get Seconds from time."""
    h, m, s = time_str.split(':')
    return float(h) * 3600 + float(m) * 60 + float(s)


def create_transcribe_job(job_name, video_id, filename, language):
    file_uri = 's3://{}/{}/{}'.format(bucket_name, video_id, filename )

    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': file_uri},
        MediaFormat='mp4',
        LanguageCode= language
    )
    return  job_name

def get_transcribe_result(job_name, file):
    job = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
    job_status = job['TranscriptionJob']['TranscriptionJobStatus']
    if job_status in ['COMPLETED', 'FAILED']:
        print(f"Job {job_name} is {job_status}.")
        if job_status == 'COMPLETED':
            json_response = urlopen(job['TranscriptionJob']['Transcript']['TranscriptFileUri']).read()
            json_data = json.loads(json_response)
            print(json_data)

            filename = file.split(".")[0]
            print("filename",filename)
            if not os.path.exists(filename):
                try:
                    os.makedirs(filename)
                except Exception as e:
                    print(e)

            for i in json_data['results']['items']:
                if i['type'] == 'pronunciation':
                    split_filename = "{}/{}.mp4".format(filename,  i['alternatives'][0]['content'])
                    start = str(datetime.timedelta(seconds=float(i['start_time'])))
                    end = str(datetime.timedelta(seconds=float(i['end_time'])))
                    start_time = get_sec(start)
                    end_time = get_sec(end)
                    print(start, "     ",end)
                    print(start_time, "       ", end_time)

                    clip = VideoFileClip(file)
                    clip_x = clip.subclip(start_time, end_time)
                    clip_x.write_videofile(split_filename)

            return {"status":"completed"}


        else:
            return {"status":"failed"}
    else:
        print("Waiting for {job_name}. Current status is {job_status}.")
        return {"status":"pending"}        

