import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {

    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Extracts the string after 'Bearer'



    if (!token) {
        return res.status(401).send('Access denied, no token found');
    }

    try {
        const decoded = jwt.verify(token, 'ABCDEFGH');
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send('Invalid token.');
    }
};

export default verifyToken;