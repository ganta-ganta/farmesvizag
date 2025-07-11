// Order-related functions are already included in app.js
// This file is kept for modularity in case you want to separate order logic

class OrderService {
    static async createOrder(orderData) {
        try {
            const newOrderRef = firebase.push(firebase.ref(db, 'orders'));
            await firebase.set(newOrderRef, orderData);
            return newOrderRef.key;
        } catch (error) {
            throw error;
        }
    }

    static async getOrderById(orderId) {
        try {
            const snapshot = await firebase.get(firebase.ref(db, `orders/${orderId}`));
            return snapshot.val();
        } catch (error) {
            throw error;
        }
    }

    static async getUserOrders(userId) {
        try {
            const snapshot = await firebase.get(firebase.ref(db, 'orders').orderByChild('userId').equalTo(userId));
            return snapshot.val();
        } catch (error) {
            throw error;
        }
    }

    static async updateOrderStatus(orderId, status) {
        try {
            await firebase.update(firebase.ref(db, `orders/${orderId}`), {
                status: status,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            throw error;
        }
    }

    static async uploadCompletionPhoto(orderId, file) {
        try {
            const fileRef = firebase.ref(storage, `order_completion/${orderId}/${file.name}`);
            await firebase.uploadBytes(fileRef, file);
            const photoUrl = await firebase.getDownloadURL(fileRef);
            
            // Add photo URL to order
            const orderRef = firebase.ref(db, `orders/${orderId}/completionPhotos`);
            const newPhotoRef = firebase.push(orderRef);
            await firebase.set(newPhotoRef, photoUrl);
            
            return photoUrl;
        } catch (error) {
            throw error;
        }
    }
}
