import App from '../App';

describe('App (smoke)', () => {
  it('module loads and exports a component', () => {
    expect(typeof App).toBe('function');
  });
});
