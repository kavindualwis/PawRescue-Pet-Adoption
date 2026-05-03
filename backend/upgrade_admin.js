const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const updateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOneAndUpdate(
      { username: 'admin' }, 
      { role: 'admin' },
      { new: true }
    );

    if (user) {
      console.log('Successfully upgraded user to admin:', user.username);
    } else {
      console.log('User "admin" not found. Please register it first.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

updateAdmin();
