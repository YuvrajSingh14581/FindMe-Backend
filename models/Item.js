import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  dateLost: {
    type: Date,
    required: true
  },
  photo: {
    type: String // URL or path to the uploaded photo
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['lost', 'found'],
    default: 'lost'
  }
}, {
  timestamps: true
});

const Item = mongoose.model('Item', itemSchema);

export default Item;
