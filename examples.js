/*
 * Multi-datastore Model:
 *
 * Requirements:
 * 1. Totally Asynchronous
 * 2. Delegate details specific to different datastores to those datastores
 * 3. Fields can be simple values, objects one or many levels deep, collections, etc...
 * 4. Certain fields may require that other fields are created first for CREATE operations(serial order).
 *    READ, UPDATE, DELETE should be completly parrallel.
 * 5. Want to get POJOs back with .val and .val=  No get() and set() methods
 * 6. Try to keep things simple.  Avoid datastore specific stuff if possible.
 * 7. Don't assume anything about DB structure.  For example, the primary key may not be called "id" as Rails
 *    assumes it is.
 * 8. Need to keep track of which fields are dirty so that only the changed fields need to be updated
 *    on a save() operation.
 * 9. Object Types may not correspond to table names in any consistent way, and JS properties might not map
 *    to table attributes in any consistent way.
 *
 * UNANSWERED QUESTIONS:
 * 1. What happens when there are N datastores and a CRUD operation only succeeds on M of them?  ACID? Rollback? Error?
 * 2. What to do about has_one and has_many relationships?
 * 3. Is it better to select which data to query by individual attributes or the groups of attributes
 *    in each data store?
 */

var keyValue, SqlOrm, MongoOrm, twitter, facebook, sqlImplementation2 = {
// All data stores will implement the following actions on primary keys or an Error will be raised.
// If the operation doesn't make sense implement a stub method that does nothing.
// Under the hood these implementations can change the key to whatever they want.
// For example, "1" could become "/Users/1" in Redis
  find: function(){}
, update: function(){}
, delete: function(){}
, create: function(){}
// This one is optional as it may only make sense to implement on 0..N datastores
, where: function(){}
}

var userSql = SqlOrm.create({
  table: 'users'
, schema: {
    id: {type:'integer', primaryKey:true}
  , name: {type:'varchar', length: 40, "null": false}
  }
});

var userMongo = MongoOrm.create({
  table: 'users'
});

var User = Model.create({
  dbs: {
    key: keyValue
  , sql: userSql
  , mongo: userMongo
  , twitter: twitter
  }

, schema: {
    id: {db:'sql'}
  , name: {db: 'sql'}
  , penName: {db: 'mongo'}
  , posts: {db: 'mongo', type: 'collection', schema: ['title', 'content']}
  , tags: {db: 'mongo', type: 'array'}
  , twitter: {
      userName: {db: 'mongo'}
    , password: {db: 'mongo'}
    , tweets: {db: 'twitter', include: false}  // Don't fetch by default
    }
  , facebook: {
      userName: {db: 'sqlImplementation2'}
    , password: {db: 'sqlImplementation2'}
    }
  , "facebook.wallPosts": {db: 'facebook'}
  , shoppingCart: {db: 'keyValue'}
  }

  // Works just like 'async' package 'auto' method.
, createPrereqs: {
    'twitter.tweets': ['twitter.userName', 'twitter.userName']
  , 'facebook.wallPosts': ['facebook.userName', 'facebook.userName']
  }
});

/*
 * @param key records primary key
 * @param limit array of fields to limit returned fields
 * @param hash of options
 * @params cb callback function
 * @returns the object matching the primary key or null
 */
User.find(1, cb);
User.find(1, ['id', 'penName'], cb);    // Fetch only these fields
User.find(1, {omit: ['penName']}, cb);  // Fetch all fields except penName

/*
 * @param whereClause data to construct a where clause if the given db's dialect
 * @param limit array of fields to limit returned fields
 * @param hash of options
 * @params cb callback function
 * @returns the object matching the primary key or null
 */
User.where({sql:'id=1'}, cb);
User.where({sql:{id: 1}}, cb);
User.where({sql:'id=1'}, ['id', 'penName'], cb);   // Fetch only these fields
User.where({sql:'id=1'}, {omit: ['penName']}, cb); // Fetch all fields except penName

User.create({name: 'bob'}, function(error, user){
  User.find(user.id, function(error, user){
    user.name; // bob
    user.tweets; // automatically finds on second level
    user.userName; // Raises Error("userName is ambiguous")
    user.name='fred';
    user.save(error, function(error, user){
      user.update(1, {name:'bob'}, function(error, user){
         user.delete(1, function(error, user){});
      });
    });
  })
});