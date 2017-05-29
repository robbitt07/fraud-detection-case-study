import pandas as pd
import numpy as np
from datetime import datetime

def unix_to_days(x):
    today = datetime.today()
    return (today - pd.to_datetime(float(x), unit='s')).days

def event_created_to_end(df):
    daf = df.copy()
    daf['event_created'] = daf['event_created'].map(lambda x: unix_to_days(x))
    daf['event_end'] = daf['event_end'].map(lambda x: unix_to_days(x))
    daf['event_created_to_end'] = daf['event_created'] - daf['event_end']
    return daf

def median_ticket_cost(x):
    costs = []
    for i in x:
        costs.append(i[u'cost'])
    return np.median(costs)

def total_tickets_sold(x):
    sold = []
    for i in x:
        sold.append(i['quantity_sold'])
    return sum(sold)

def clean_data(df):
    '''
    INPUT: json file
    OUTPUT: pandas DataFrame
    '''
    df2 = event_created_to_end(df)
    df3 = df2[['channels', 'delivery_method', 'show_map',
               'user_type', 'has_logo', 'ticket_types',
               'org_facebook', 'payout_type', 'sale_duration',
               'sale_duration2', 'event_created_to_end']]

    df3['num_ticket_type'] = map(lambda X: len(X) if len(X) > 0 else None, df3['ticket_types'])
    df3['median_ticket_cost'] = map(lambda X: median_ticket_cost(X), df3['ticket_types'])
    df3['total_tickets_sold'] = map(lambda X: total_tickets_sold(X), df3['ticket_types'])

    df3['nan_delivery_method'] = pd.isnull(df3['delivery_method'])
    df3['nan_org_facebook'] = pd.isnull(df3['org_facebook'])
    df3['nan_num_ticket_type'] = pd.isnull(df3['num_ticket_type'])
    df3['nan_median_ticket_cost'] = pd.isnull(df3['median_ticket_cost'])

    df3['payout_type'] = map(lambda x: x if x != '' else None, df3['payout_type'])

    df3['payout_type'] = df3['payout_type'].fillna('MISSING')
    df3 = df3.fillna(999)

    df3['payout_type_CHECK'] = map(lambda x: 1 if x == 'CHECK' else 0, df3['payout_type'])
    df3['payout_type_MISSING'] = map(lambda x: 1 if x == 'MISSING' else 0, df3['payout_type'])


    #df3 = pd.get_dummies(df3, columns=['payout_type'], drop_first=True)
    df3.drop(['ticket_types', 'payout_type'], axis=1, inplace=True)

    return df3
