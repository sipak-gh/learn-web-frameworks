import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function List() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setItems([...items, { id: crypto.randomUUID(), title: trimmed }]);
    setTitle('');
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input aria-label="New item" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button>Add</button>
      </form>
      <ul>
        {items.map((item) => <li key={item.id}>{item.title}</li>)}
      </ul>
      <p>{items.length + (items.length === 1 ? ' item' : ' items')}</p>
    </>
  );
}

createRoot(document.getElementById('app')).render(<List />);
