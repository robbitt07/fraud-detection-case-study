var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var Link = ReactRouter.Link;
var hashHistory = ReactRouter.hashHistory;

var headerStyle = {
  'position': 'fixed',
  'top': '0px',
  'left': 'auto',
  'zIndex': '10'
}

var Header = React.createClass({
  render: function() {
    return (
      <div className="ui borderless large menu fixed" style={headerStyle}>
        <div className="ui text container">
          <div className="header item">
            <Link to="/">
              <i className="ban icon"></i>
              No Fraud Zone
            </Link>
          </div>
          <div className="item">
            <Link className="black" to="/about">What is this?</Link>
          </div>
        </div>
      </div>
    )
  }
})
var Feed = React.createClass({
  getInitialState() {
    return {
      loadedOnce: false
    }
  },
  approve(i) {
    console.log('i', i)
    this.props.removeFromData(i)
  },
  inspect() {
    //console.log('inspecting')
    //this.props.setLoading()
  },
  render: function() {
    var that = this
    var feed = this.props.data.map(function(item, i) {
      var fraud_p = parseFloat(item.probabilities[0][1])
      if (fraud_p < .1) {
        var label = (<a className="ui green ribbon label">Safe</a>)
      } else if (fraud_p < .8) {
        var label = (<a className="ui yellow ribbon label">Potential Fraud</a>)
      } else {
        var label = (<a className="ui red ribbon label">Action Required: High Chance of Fraud</a>)
      }
      return (
        <div key={i} id={'card_' + i} className="ui link card">
          <div className="content">
            {label}

            <div className="content">
              <div className="header">{item.name.length > 1 ? item.name : 'No event name'}</div>
              <div className="meta">{item.org_name.length > 1 ? item.org_name : 'Unknown organization'}</div>
              <div className="description">{'Created on ' + moment(item.event_created).format('MM/DD/YYYY')}</div>
              <div className="description">{'Probability of Fraud: ' + fraud_p.toPrecision(3)}</div>
            </div>
          </div>
          <div className="extra content">
            <div className="ui two buttons">
              <div onClick={that.approve.bind(null, i)} className={fraud_p >= .1 ? "ui inverted green disabled button" : "ui inverted green button"}>Approve</div>
              <Link to={'/data/' + item.object_id}><div className={that.props.loading ? "ui inverted loading blue button" : "ui inverted blue button"}>Inspect</div></Link>
            </div>
          </div>
        </div>
        )
    })

    return (
      <div className="ui large middle aligned animated list">
        <div className="ui cards">
          <h2 className="ui header">
            <i className="list icon"></i>
            <div className="content">
              Feed
            </div>
          </h2>
          {feed}
        </div>
      </div>
    )

  }
})
var Dash = React.createClass({
  getInitialState() {
    return {
      data: [],
      newData: {}
    }
  },
  removeFromData(i) {
    var copy = this.state.data 
    copy.splice(i, 1);
    this.setState({
      data: copy
    })
  },
  componentDidMount() {
    var socket = io.connect('http://localhost:8080');

    var that = this
    socket.on('connect', function() {
      that.props.setLoading();
      $.get('/fetch_all', function(data) {
        that.setState({
          data: data.results.reverse(),
        })
        that.props.setLoading()
      })

      socket.on('new_data', function(data) {
        var d = that.state.data
        if (Object.keys(data).length !== 0) {
          d.reverse().push(data.data)
          that.setState({
            newData: data.data,
            data: d.reverse()
          })
        }
      })

    })
    
  },
  render: function() {
    var that = this
    var children = React.Children.map(this.props.children, function (child) {
      return React.cloneElement(child, {
        data: that.state.data,
        setLoading: that.props.setLoading,
        loading: that.props.loading
      })
    })
    return (
      <div className="ui main 2 column internally celled grid stackable container" style={{"paddingTop": "4rem"}}>
        
        <div className="four wide column">
          <Feed data={this.state.data} newData={this.state.newData} removeFromData={that.removeFromData} setLoading={this.props.setLoading}/>
        </div>

        <div className="ten wide column">
          {children}
        </div>
        
      </div>
    )
  }
})
var Home = React.createClass({
  getInitialState: function( ) {
    return {
      loading: false
    }
  },
  setLoading: function() {
    this.setState({
      loading: !this.state.loading
    })
  },
  render: function() {
    var that = this
    var children = React.Children.map(this.props.children, function (child) {
      return React.cloneElement(child, {
        setLoading: that.setLoading,
        loading: that.state.loading
      })
    })
    return (
      <div className="dimmable">

        <Header />
        {children}
        <div className={this.state.loading ? "ui active centered inline massive loader" : ""}>
        </div>

      </div>
    )
  }
})

var Analytics = React.createClass({
  getInitialState: function() {
    return {
      objID: '',
      matchingObj: {},
      htmlString: ''
    }
  },
  componentWillReceiveProps: function(nextProps) {
    var objID = nextProps.params.object_id

    var data = nextProps.data
    var matchingObj = data.filter(function(item) {
      return item.object_id.toString() === objID
    })
    console.log('matching', matchingObj)
    this.setState({
      matchingObj: matchingObj[0]
    })
    var that = this
    $.ajax({
      type: "POST",
      url: '/badass_graphs',
      data: JSON.stringify({data_point: matchingObj[0]}, null, '\t'),
      contentType: 'application/json;charset=UTF-8',
      success: function(resp) {
        that.setState({
          htmlString: resp.html
        })
        window.eval(resp.script)
        

      }
    })

  },
  componentDidMount() {
    //this.props.setLoading()
    $('.bk-root')
      .sticky({
        context: '.four.wide.column',
        pushing: true
      })
    ;
  },
  render: function() {
    return (
      <div className="ui center aligned container">
        <h2>{this.state.matchingObj.name}</h2>
        <div className="content" dangerouslySetInnerHTML={{__html: this.state.htmlString}}></div>
      </div>
      )

    
  }
})

var About = React.createClass({
  render: function() {
    return (
      <div className="ui raised very padded text container segment">
        <h1 className="ui header">What is this?</h1>
        <h2 className="ui header">NoFraud.Zone is a analytics dashboard for fradulent events.</h2>
        <p></p>
        <p></p>
      </div>
      )
  }
})
var App = React.createClass({
  render: function() {
    return (
      <Router history={hashHistory}>
        <Route component={Home}>
          <Route path="/" component={Dash}>
            <Route path="/data/:object_id" component={Analytics}/>
          </Route>
          <Route path="/about" component={About} />
        </Route>
      </Router>
      )
  }
})

ReactDOM.render(
  React.createElement(App, null),
  document.getElementById('root')
)