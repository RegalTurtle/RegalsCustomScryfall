import {Router} from 'express';
const router = Router();
import {cardData} from '../data/index.js';
import validation from '../data/validation.js';

router
  .route('/')
  .get(async (req, res) => {
    try {
      const cardList = await cardData.getAllCards();
      return res.json(cardList);
    } catch (e) {
      return res.status(500).send(e);
    }
  });

router
  .route('/:id')
  .get(async (req, res) => {
    try {
      req.params.id = validation.checkId(req.params.id);
    } catch (e) {
      return res.status(400).json({error: e});
    }
    try {
      const post = await postData.getPostById(req.params.id);
      return res.json(post);
    } catch (e) {
      return res.status(404).json(e);
    }
  })
  .post(async (req, res) => {
    return res.send(
      `POST request to http://localhost:3000/posts/${req.params.id}`
    );
  })
  .delete(async (req, res) => {
    return res.send(
      `DELETE request to http://localhost:3000/posts/${req.params.id}`
    );
  })
  .patch(async (req, res) => {
    return res.send(
      `PATCH request to http://localhost:3000/posts/${req.params.id}`
    );
  });

//alternitive way to create the same /:id routes that are defined above

// router.get('/:id', async (req, res) => {
//   return res.send ("GET ID")
//   //get route here.
// });

// router.post('/:id', async (req, res) => {
//   return res.send ("POST ID")
// });

// router.delete('/:id', async (req, res) => {
//   return res.send ("DELETE ID")
// });

// router.patch('/:id', async (req, res) => {
//   return res.send ("PATCH ID")
// });

//alternitive way to create the same / routes that are defined above

// router.get('/', async (req, res) => {
//   try {
//     const postList = await postData.getAllPosts();
//     return res.json(postList);
//   } catch (e) {
//     res.status(500).send(e);
//   }
// });

// router.post('/', async (req, res) => {
//   //post code here.
//   let x = 5;
//   res.json(x);
// });

// router.delete('/', async (req, res) => {
//   let x = 5;
//   res.json(x);
// });

export default router;
