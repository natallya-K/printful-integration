const express = require('express');
const { getProducts, createOrder } = require('./printful');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Printful Integration API');
});

app.get('/products', async (req, res) => {
    try {
        const products = await getProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WORKING POST REQUEST
//app.post('/orders', async (req, res) => {
//    try {
//       const orderData = req.body;
//     const order = await createOrder(orderData);
//   res.json(order);
//    } catch (error) {
//        res.status(500).json({ error: error.message });
//    }
// });

// POST REQUEST WITH DATABASE
app.post('/orders', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { recipient, items } = req.body;
        const { name, address1, city, state_code, country_code, zip } = recipient;
        const { variant_id, quantity, files } = items[0];
        const { url } = files[0];

        console.log("Storing order data in the database...");

        // Store order data in the database
        const [result] = await connection.query(
            `INSERT INTO printfulorders (recipient_name, address1, city, state_code, country_code, zip, variant_id, quantity, file_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, address1, city, state_code, country_code, zip, variant_id, quantity, url]
        );

        // Get the inserted order ID
        const orderId = result.insertId;

        console.log(`Order data stored in database with orderId: ${orderId}`);

        // Prepare order data for Printful
        const orderData = {
            recipient: {
                name,
                address1,
                city,
                state_code,
                country_code,
                zip
            },
            items: [
                {
                    variant_id,
                    quantity,
                    files: [
                        {
                            url
                        }
                    ]
                }
            ]
        };

        // Send order data to Printful
        const printfulResponse = await createOrder(orderData);

        console.log("Order data sent to Printful successfully.");

        // Return response
        res.json({
            orderId,
            printfulResponse
        });
    } catch (error) {
        console.error("Error during the order process:", error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

