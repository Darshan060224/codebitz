import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function CreateAuction() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    startBid: '',
    minIncrement: '200',
    reservePrice: '',
    retailPrice: '',
    startTime: '',
    endTime: '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(newImages);
    setPreviews(newPreviews);
    // Reset the file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('startBid', form.startBid);
      formData.append('minIncrement', form.minIncrement);
      if (form.reservePrice) formData.append('reservePrice', form.reservePrice);
      if (form.retailPrice) formData.append('retailPrice', form.retailPrice);
      formData.append('startTime', form.startTime);
      formData.append('endTime', form.endTime);
      images.forEach((img) => formData.append('images', img));

      await api.post('/admin/auctions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Auction created!');
      navigate('/admin/auctions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Electronics', 'Fashion', 'Collectibles', 'Art', 'Sports', 'Vehicles', 'General'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">➕ Create Auction</h1>

      <form onSubmit={handleSubmit} className="glass p-8 fu2">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="dark-input" placeholder="Gaming Laptop RTX 4090" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="dark-input" placeholder="High performance gaming laptop..." />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
              Upload Images (max 5)
            </label>
            <div
              className="relative rounded-xl p-6 text-center cursor-pointer transition-colors"
              style={{ border: '2px dashed rgba(124,58,237,.4)', background: 'rgba(124,58,237,.05)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImages}
                className="hidden"
              />
              <p className="text-lg mb-1" style={{ color: '#a855f7' }}>📁 Click to upload images</p>
              <p className="text-xs" style={{ color: '#64748b' }}>JPEG, PNG, GIF, WebP — Max 5MB each</p>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-xl"
                      style={{ border: '2px solid rgba(124,58,237,.3)' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: '#ef4444' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="dark-select w-full">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Starting Bid (₹) *</label>
            <input name="startBid" type="number" value={form.startBid} onChange={handleChange} required min="1"
              className="dark-input" placeholder="5000" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Min Increment (₹)</label>
            <input name="minIncrement" type="number" value={form.minIncrement} onChange={handleChange} min="1"
              className="dark-input" placeholder="200" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Reserve Price (₹)</label>
            <input name="reservePrice" type="number" value={form.reservePrice} onChange={handleChange}
              className="dark-input" placeholder="Optional" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Retail Price (₹)</label>
            <input name="retailPrice" type="number" value={form.retailPrice} onChange={handleChange}
              className="dark-input" placeholder="Market value for price anchor" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>Start Time *</label>
            <input name="startTime" type="datetime-local" value={form.startTime} onChange={handleChange} required
              className="dark-input" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>End Time *</label>
            <input name="endTime" type="datetime-local" value={form.endTime} onChange={handleChange} required
              className="dark-input" />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button type="submit" disabled={loading} className="btn-gradient flex-1 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Auction'}
          </button>
          <button type="button" onClick={() => navigate('/admin/auctions')} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
