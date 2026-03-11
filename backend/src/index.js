require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenSlot running on 0.0.0.0:${PORT}`);
});
