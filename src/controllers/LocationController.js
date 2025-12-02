// controllers/locationController.js

import Location from "../models/Location.js";

// controllers/locationController.js
export const searchLocation = async (req, res) => {
    try {
        const { type, search = "", country, state } = req.query;

        if (!["country", "state", "city"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid type parameter"
            });
        }

        let match = {};

        if (search) {
            match[type] = { $regex: search, $options: "i" };
        }

        // Filter states by country
        if (type === "state" && country) {
            const cleanCountry = parseNewLocationTag(country);
            if (cleanCountry) match.country = { $regex: '^' + cleanCountry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' };
        }

        // Filter cities by state (and optionally country)
        if (type === "city") {
            if (state) {
                const cleanState = parseNewLocationTag(state);
                if (cleanState) match.state = { $regex: '^' + cleanState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' };
            }
            if (country) {
                const cleanCountry = parseNewLocationTag(country);
                if (cleanCountry) match.country = { $regex: '^' + cleanCountry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' };
            }
        }

        const results = await Location.aggregate([
            { $match: match },
            { $group: { _id: `$${type}` } },
            { $sort: { _id: 1 } }
        ]);

        const formatted = results.map(r => ({
            id: r._id,
            text: r._id
        }));

        res.json({
            success: true,
            results: formatted
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// New utility function to strip the prefix used by the front-end
export const parseNewLocationTag = (value) => {
    const NEW_LOC_PREFIX = 'NEW_LOC:';
    if (value && typeof value === 'string' && value.startsWith(NEW_LOC_PREFIX)) {
        return value.replace(NEW_LOC_PREFIX, '').trim();
    }
    return value; // Return as is if it's not a new tag
};

// controllers/locationController.js

export const createOrGetLocation = async ({ country, state, city }) => {
    country = country.trim();
    state = state.trim();
    city = city.trim();

    let existing = await Location.findOne({ country, state, city });
    if (existing) return existing;

    const newLoc = new Location({ country, state, city });
    await newLoc.save();
    return newLoc;
};

export const addLocation = async (req, res) => {
    try {
        const { country, state, city } = req.body;

        if (!country || !state || !city) {
            return res.status(400).json({
                success: false,
                message: "Country, State, and City are required"
            });
        }

        const location = await createOrGetLocation({ country, state, city });

        res.json({
            success: true,
            message: location.isNew ? "Location created" : "Location already exists",
            data: location
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding location", error: error.message });
    }
};