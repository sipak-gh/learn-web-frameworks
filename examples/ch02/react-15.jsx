var List = React.createClass({
  getInitialState: function () {
    return { items: [], title: '' };
  },

  handleChange: function (event) {
    this.setState({ title: event.target.value });
  },

  handleSubmit: function (event) {
    event.preventDefault();
    var title = this.state.title.trim();
    if (!title) return;
    this.setState({ items: this.state.items.concat([title]), title: '' });
  },

  render: function () { // describe the whole UI; React works out the DOM changes
    var n = this.state.items.length;
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <input aria-label="New item" value={this.state.title} onChange={this.handleChange} />
          <button>Add</button>
        </form>
        <ul>
          {this.state.items.map(function (item, i) {
            return <li key={i}>{item}</li>;
          })}
        </ul>
        <p>{n + (n === 1 ? ' item' : ' items')}</p>
      </div>
    );
  }
});

ReactDOM.render(<List />, document.getElementById('app'));
