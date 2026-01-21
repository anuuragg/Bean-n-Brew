export const getAllProducts = (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            "id": 101,
            "name": "Cappuccino",
            "type": "hot",
            "origin": "Italy",
            "price": 180,
            "currency": "INR",
            "size": ["small", "medium", "large"],
            "ingredients": [
                "espresso",
                "steamed milk",
                "milk foam"
            ],
            "caffeine_mg": 80,
            "is_available": true,
            "rating": 4.6
        }
    })
}