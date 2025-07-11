// Authentication functions are already included in app.js
// This file is kept for modularity in case you want to separate auth logic

// Example of how you might structure it:
class AuthService {
    static async login(email, password) {
        try {
            const userCredential = await firebase.signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    }

    static async register(email, password, userData) {
        try {
            const userCredential = await firebase.createUserWithEmailAndPassword(auth, email, password);
            await firebase.set(firebase.ref(db, 'users/' + userCredential.user.uid), userData);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    }

    static async resetPassword(email) {
        try {
            await firebase.sendPasswordResetEmail(auth, email);
            return true;
        } catch (error) {
            throw error;
        }
    }

    static async logout() {
        try {
            await firebase.signOut(auth);
            return true;
        } catch (error) {
            throw error;
        }
    }
}
