// Product-related functions are already included in app.js
// This file is kept for modularity in case you want to separate product logic

class ProductService {
    static async getAllProducts() {
        try {
            const snapshot = await firebase.get(firebase.ref(db, 'products'));
            return snapshot.val();
        } catch (error) {
            throw error;
        }
    }

    static async getProductById(productId) {
        try {
            const snapshot = await firebase.get(firebase.ref(db, `products/${productId}`));
            return snapshot.val();
        } catch (error) {
            throw error;
        }
    }

    static async addProduct(productData) {
        try {
            const newProductRef = firebase.push(firebase.ref(db, 'products'));
            await firebase.set(newProductRef, productData);
            return newProductRef.key;
        } catch (error) {
            throw error;
        }
    }

    static async updateProduct(productId, updates) {
        try {
            await firebase.update(firebase.ref(db, `products/${productId}`), updates);
            return true;
        } catch (error) {
            throw error;
        }
    }

    static async deleteProduct(productId) {
        try {
            await firebase.remove(firebase.ref(db, `products/${productId}`));
            return true;
        } catch (error) {
            throw error;
        }
    }
}
