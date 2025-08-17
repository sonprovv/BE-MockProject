/**
 * @swagger
 * tags:
 *   name: Carts
 *   description: Cart operations (backed by the carts collection in the database)
 *
 * /carts:
 *   get:
 *     summary: Get all carts
 *     tags: [Carts]
 *     responses:
 *       200:
 *         description: List of carts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cart'
 *   post:
 *     summary: Create a new cart (or store a cart snapshot)
 *     description: Create a cart document. You can also use this to persist a user's current cart state.
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewCart'
 *     responses:
 *       201:
 *         description: Cart created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Unauthorized
 *
 * /carts/{id}:
 *   get:
 *     summary: Get a cart by ID
 *     tags: [Carts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The cart ID
 *     responses:
 *       200:
 *         description: Cart details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart not found
 *   put:
 *     summary: Replace a cart by ID
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cart'
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart not found
 *   delete:
 *     summary: Delete a cart
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart not found
 *
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         bookId:
 *           type: string
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         originalPrice:
 *           type: number
 *           nullable: true
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         image:
 *           type: string
 *         seller:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             logo:
 *               type: string
 *               nullable: true
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totalItems:
 *           type: integer
 *         subtotal:
 *           type: number
 *         totalDiscount:
 *           type: number
 *         total:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     NewCart:
 *       type: object
 *       required:
 *         - userId
 *         - items
 *       properties:
 *         userId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totalItems:
 *           type: integer
 *         subtotal:
 *           type: number
 *         totalDiscount:
 *           type: number
 *         total:
 *           type: number
 */
