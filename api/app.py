from flask import Flask, jsonify, render_template, request
from sklearn.externals import joblib
from JSON_to_DF import *
import pandas as pd
import requests
from pymongo import MongoClient
from bson import json_util, ObjectId
import json
from flask import send_from_directory
from flask_socketio import SocketIO
import os
import time
from badass_plot import badass_plot
import ast
from bs4 import BeautifulSoup

import collections
from datetime import datetime

client = MongoClient()

db = client['fraud-case-study']
clf = joblib.load('zack_xgboost.pkl')


app = Flask(__name__)
socketio = SocketIO(app)


'''
ROUTES
'''

#For serving js files

@app.route('/', methods=['GET'])
def index():
  return render_template('index.html')

@app.route('/components/<path:filename>')
def serve_static(filename):
    root_dir = os.path.dirname(os.getcwd())
    return send_from_directory(os.path.join(root_dir, 'fraud-detection-case-study', 'api', 'components'), filename)

@app.route('/predict', methods=['POST'])
def predict():
  json_ = request.json
  query_df = pd.DataFrame(json_)
  #clean the query
  query = clean_data(query_df).values
  predictions = clf.predict(query)
  return jsonify({
    'predictions': list(predictions)
    })

@app.route('/score', methods=['POST'])
def score():
  json_ = request.json
  print('json', json_)
  query_df = pd.DataFrame(json_)
  #clean the query
  query = clean_data(query_df).values
  predictions = clf.predict_proba(query)
  return jsonify({
    'predictions': list(predictions)
    })

@app.route('/fetch_all', methods=['GET'])
def fetch_all():
  coll = db['data_with_predicted_labels']
  data = coll.find().limit(10)
  results = []
  for i in data:
    results.append(i)
  results_sanitized = json.loads(json_util.dumps(results))
  return jsonify({
    'results': results_sanitized
  })

@app.route('/get_data', methods=["GET"])
def get_data():
  result = requests.get("http://galvanize-case-study-on-fraud.herokuapp.com/data_point")
  json_ = result.json()
  query_df = pd.DataFrame.from_dict(json_,  orient='index')
  query_df = query_df.transpose()
  #clean the query
  query = clean_data(query_df).values
  predictions = clf.predict(query).tolist()
  pred_probs = clf.predict_proba(query).tolist()
  coll = db['data_with_predicted_labels']
  json_['predictions'] = predictions
  json_['probabilities'] = pred_probs
  data = coll.insert_one(json_)
  print('data', data.inserted_id)
  if not data.inserted_id:
    print('shit')
    return jsonify({
      'id_inserted': ''
    })
  json_sanitized = json.loads(json_util.dumps(json_))
  socketio.emit('new_data', {'data': json_sanitized}, broadcast=True)
  return jsonify({
    'id_inserted': str(data.inserted_id)
  })

@app.route('/badass_graphs', methods=['POST'])
def get_graph_html():
  new_point = request.json['data_point']
  new_point['event_created'] = unix_to_days(new_point['event_created'])
  new_point['event_end'] = unix_to_days(new_point['event_end'])
  new_point['event_created_to_end'] = new_point['event_created'] - new_point['event_end']
  new_point['total_tickets_sold'] = total_tickets_sold(new_point['ticket_types'])
  new_point['median_ticket_cost'] = median_ticket_cost(new_point['ticket_types'])

  new_point['payout_type_CHECK'] =  1 if new_point['payout_type'] == 'CHECK' else 0
  new_point['payout_type_MISSING'] = 1 if new_point['payout_type'] == 'CHECK' else 0
  print('new_point', new_point['event_created_to_end'])
  html = badass_plot(new_point, new_df)
  soup = BeautifulSoup(html, 'html.parser')
  body = soup.find('body')
  script_txt = body.script.get_text()

  #parse html string

  return jsonify({
    'html': str(body),
    'script': script_txt
  })

#Catch all route
@app.route('/*', methods=['GET'])
def catch_all():
  return render_template('index.html')




if __name__ == '__main__':
  df = pd.read_csv('files/NEWER_Clean_df.csv', index_col=0)
  d = {0: 'Not Fraud', 1: 'Fraud'}
  new_df = df[df['event_created_to_end'] < 15]
  new_df.replace({'label': d}, inplace=True)
  new_df['label'].unique()
  new_df['color_set'] = ['#FF8C00' if element == 'Fraud' else '#FAFCCC' for element in np.array(new_df['label'])]

  menu = ["event_created_to_end", "total_tickets_sold",
          "payout_type_MISSING", "median_ticket_cost"]
  newpoint = {'event_created_to_end': 11, 'total_tickets_sold' : 200, 'median_ticket_cost' : 100, 'payout_type_MISSING' : 1}

  plt = badass_plot(newpoint, new_df)
  socketio.run(app, port=8080, debug=True, threaded=True)

