// models/Location.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const EmbeddedLocationSchema = new Schema(
    {
        country: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true }
    },
    {
        _id: false,
        timestamps: false
    }
);

const locationSchema = new Schema(
    {
        country: { type: String, trim: true, required: true },
        state: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true }
    },
    {
        timestamps: true
    }
);

locationSchema.index({ country: 1, state: 1, city: 1 }, { unique: true });

locationSchema.index({ country: "text", state: "text", city: "text" });

const Location = mongoose.model('Location', locationSchema);

export default Location;
export { EmbeddedLocationSchema as LocationSchema };