import express from 'express';
import axios from 'axios'; // To call Product Service
import { getSession } from '../neo4j.js';
import authMiddleware from '../authMiddleware.js';

const router = express.Router();

// CUSTOMER DASHBOARD (History)
router.get('/dashboard/customer', authMiddleware, async (req, res) => {
    const session = getSession();
    try {
        const cypher = `
            MATCH (u:User {id: $userId})-[r:TRANSACTION]->(i:Item)
            RETURN i.id as itemId, i.name as name, i.price as price, i.image as image, r.type as type, r.date as date
        `;
        const result = await session.run(cypher, { userId: req.user.id });
        
        const history = result.records.map(record => {
            const type = record.get('type');
            const price = record.get('price'); // This comes from Neo4j

            return {
                _id: record.get('itemId'),
                name: record.get('name'),
                imageUrl: record.get('image'),
                // --- FIX STARTS HERE ---
                // 1. Map 'type' to 'listingType' so the frontend if-statement works
                listingType: type, 
                
                // 2. Assign price to the specific field the frontend expects
                pricePerDay: type === 'borrow' ? Number(price) : 0,
                salePrice: type === 'sale' ? Number(price) : 0,
                
                // 3. Add status just in case
                status: type === 'sale' ? 'Sold' : 'Borrowed',
                date: record.get('date')
                // --- FIX ENDS HERE ---
            };
        });

        res.json({
            borrowed: history.filter(h => h.listingType === 'borrow'),
            purchased: history.filter(h => h.listingType === 'sale')
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Graph DB Error' });
    } finally {
        await session.close();
    }
});

// RECOMMENDATIONS
router.get('/dashboard/recommendations', authMiddleware, async (req, res) => {
    const session = getSession();
    try {
        const cypher = `
            MATCH (me:User {id: $userId})-[:TRANSACTION]->(:Item)<-[:TRANSACTION]-(other:User)-[:TRANSACTION]->(rec:Item)
            WHERE NOT (me)-[:TRANSACTION]->(rec)
            RETURN DISTINCT rec.id as id, rec.name as name, rec.image as image LIMIT 5
        `;
        const result = await session.run(cypher, { userId: req.user.id });
        const recommendations = result.records.map(r => ({
            _id: r.get('id'),
            name: r.get('name'),
            imageUrl: r.get('image')
        }));
        
        res.json(recommendations);
    } catch (err) {
        res.status(500).json({ error: 'Graph DB Error' });
    } finally {
        await session.close();
    }
});

// EXECUTE ORDER (Borrow/Buy)
router.post('/', authMiddleware, async (req, res) => {
    const { itemId, type } = req.body; 
    const userId = req.user.id;
    const session = getSession();

    try {
        // 1. Get Item Details from Product Service
        const productRes = await axios.get(`${process.env.PRODUCT_SERVICE_URL}/api/items`);
        const item = productRes.data.find(i => i._id === itemId);

        if (!item || item.status !== 'Available') {
            return res.status(400).json({ error: 'Item not available' });
        }
        if (item.owner === userId) {
            return res.status(400).json({ error: 'Cannot buy your own item' });
        }

        const price = type === 'borrow' ? item.pricePerDay : item.salePrice;

        // 2. Create Transaction in Neo4j
        const cypher = `
            MERGE (u:User {id: $userId})
            MERGE (i:Item {id: $itemId})
            SET i.name = $itemName, i.price = $price, i.image = $image
            CREATE (u)-[r:TRANSACTION {
                type: $type,
                price: $price,
                date: datetime()
            }]->(i)
            RETURN r
        `;
        
        await session.run(cypher, { 
            userId, 
            itemId, 
            itemName: item.name, 
            price: Number(price), 
            image: item.imageUrl,
            type 
        });

        // 3. Update Status in Product Service
        await axios.put(`${process.env.PRODUCT_SERVICE_URL}/api/items/${itemId}/status`, {
            status: type === 'sale' ? 'Sold' : 'Borrowed'
        });

        res.json({ message: 'Order successful' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        await session.close();
    }
});

export default router;