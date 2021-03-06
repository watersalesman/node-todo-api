const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('./../server');
const { Todo } = require('./../models/todo');
const { User } = require('./../models/user');
const { todos, populateTodos, users, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
  it('Should create a new todo', (done) => {
    let text = 'Test todo';
    
    request(app)
      .post('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .send({text})
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find({text}).then((todos) => {
          expect(todos.length).toBe(1);
          expect(todos[0].text).toBe(text);
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should not create a new todo', (done) => {
    request(app)
      .post('/todos')
      .set('x-auth', users[0].tokens[0].token)      
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find().then((todos) => {
          expect(todos.length).toBe(2);
          done();
        }).catch((e) => done(e));
      });
  });
});

describe('GET /todos', () => {
  it('Should get todos', (done) => {
    request(app)
      .get('/todos')
      .set('x-auth', users[0].tokens[0].token)      
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('Should return todo doc', (done) => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)            
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todos[0].text);
      })
      .end(done);
  });

  it('Should not return a todo doc created by another user', (done) => {
    request(app)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)            
      .expect(404)
      .end(done);
  });

  it('Should return a 404 if todo not found', (done) => {
    let id = new ObjectID().toHexString();
    request(app)
      .get('/todos/' + id)
      .set('x-auth', users[0].tokens[0].token)            
      .expect(404)
      .end(done)
  });

  it('Should return a 404 for non-object ids', (done) => {
    request(app)
      .get('/todos/123')
      .set('x-auth', users[0].tokens[0].token)      
      .expect(404)
      .end(done)
  });
});

describe('DELETE /todos/:id', () => {
  it('Should remove a todo', (done) => {
    let id = todos[1]._id.toHexString();
    request(app)
      .delete('/todos/' + id)
      .set('x-auth', users[1].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(id);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(id).then((todo) => {
          expect(todo).toNotExist();
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should not remove a todo', (done) => {
    let id = todos[0]._id.toHexString();
    request(app)
      .delete('/todos/' + id)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(id).then((todo) => {
          expect(todo).toExist();
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should return a 404 if todo not found', (done) => {
    request(app)
      .delete('/todos/' + new ObjectID())
      .set('x-auth', users[1].tokens[0].token)      
      .expect(404)
      .end(done);
  });

  it('Should return a 404 if object id is invalid', (done) => {
    request(app)
      .delete('/todos/123a')
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

});

describe('PATCH /todos/:id', () => {

  it('Should update the todo', (done) => {
    let id = todos[0]._id.toHexString();
    let todo = {
      text: 'Updated todo',
      isCompleted: true
    }

    request(app)
      .patch('/todos/' + id)
      .set('x-auth', users[0].tokens[0].token)
      .send({text: todo.text, isCompleted: todo.isCompleted})
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todo.text);
        expect(res.body.todo.isCompleted).toBe(true);
        expect(res.body.todo.completedAt).toBeA('number');
      })
      .end(done);
  });

    it('Should not update the todo', (done) => {
    let id = todos[0]._id.toHexString();
    let todo = {
      text: 'Updated todo',
      isCompleted: true
    }

    request(app)
      .patch('/todos/' + id)
      .set('x-auth', users[1].tokens[0].token)
      .send({text: todo.text, isCompleted: todo.isCompleted})
      .expect(404)
      .end(done);
  });

  it('Should clear completedAt when todo is not completed', (done) => {
    let id = todos[1]._id.toHexString();
    let todo = {
      text: 'Also updated todo',
      isCompleted: false
    }

    request(app)
      .patch('/todos/' + id)
      .set('x-auth', users[1].tokens[0].token)      
      .send({text: todo.text, isCompleted: todo.isCompleted})
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todo.text);
        expect(res.body.todo.isCompleted).toBe(false);
        expect(res.body.todo.completedAt).toNotExist();
      })
      .end(done);
  })

});

describe('GET /users/me', () => {
  it('Should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done);
  });

  it('Should return a 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({})
      })
      .end(done)
  });
});

describe('POST /users', () => {
  it('Should create a user', (done) => {
    let email = 'yonik@gmail.com';
    let password = 'testlul';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
        expect(res.body._id).toExist();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if (err) {
          return done(err)          
        }

        User.findOne({email}).then((user) => {
          expect(user).toExist();
          expect(user.password).toNotBe(password);
          done();
        }).catch((e) => done(e));        
      });
  });

  it('Should return validation errors if request is invalid', (done) => {
    request(app)
      .post('/users')
      .send({email: 'yo.com', password: 'lul'})
      .expect(400)
      .end(done);
  });

  it('Should not create user if email is already registered', (done) => {
    request(app)
      .post('/users')
      .send({email: users[0].email, password: 'testlul'})
      .expect(400)
      .end(done);
  });
});

describe('POST /users/login', () => {
  it('Should login user and return auth token', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens[1]).toInclude({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should reject invalid login', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: 'lulwat'
      })
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toNotExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).toBe(1);
          done();
        }).catch((e) => done(e));
      });
  });
});

describe('DELETE /users/me/token', () => {
  it('Should delete x-auth token on logout', (done) => {
    request(app)
      .delete('/users/me/token')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[0]._id).then((user) => {
          expect(user.tokens.length).toBe(0);
          done();
        }).catch((e) => done(e));
      });
  });
})