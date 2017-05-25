var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var Link = ReactRouter.Link;
var hashHistory = ReactRouter.hashHistory;


var Header = React.createClass({
  render: function() {
    return (
      <div className="ui borderless main menu fixed">
        <div className="ui text container">
          <div href="/" className="header item">
            <i className="ban icon"></i>
            No Fraud Zone
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
  componentWillReceiveProps(nextProps) {
    if (nextProps.data.length > 1) {
      this.setState({
        loadedOnce: true
      })
    }
  },
  inspect() {
    console.log('inspecting')
    this.props.setLoading()
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
        <div key={i} id={i === 0 ? 'first_card' : ''} className="ui card">
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
              <div className={fraud_p >= .1 ? "ui basic green disabled button" : "ui basic green button"}>Approve</div>
              <div onClick={that.inspect} className="ui basic blue button"><Link to={'/data/' + item.object_id}>Inspect</Link></div>
            </div>
          </div>
        </div>
        )
    })

    return (
      <div className="ui large middle aligned animated list">

        <div className="ui cards">
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
        setLoading: that.props.setLoading
      })
    })
    return (
      <div className="ui 2 column internally celled grid stackable container segment">
        
        <div className="six wide column">
          <Feed data={this.state.data} newData={this.state.newData} setLoading={this.props.setLoading}/>
        </div>

        <div className="six wide column">
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
        setLoading: that.setLoading
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
      matchingObj: [],
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
        that.props.setLoading();
        

      }
    })

  },
  render: function() {
    return (
      <div className="content" dangerouslySetInnerHTML={{__html: this.state.htmlString}}></div>
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
        </Route>
      </Router>
      )
  }
})

ReactDOM.render(
  React.createElement(App, null),
  document.getElementById('root')
)