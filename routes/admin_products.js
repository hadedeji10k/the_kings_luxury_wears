const express = require("express");
const router = express.Router();
const mkdirp = require("mkdirp");
const fse = require("fs-extra");
const resizeImg = require("resize-img");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const auth = require("../config/auth");
const isAdmin = auth.isAdmin;

const app = express();

// Express File-Upload middleware
app.use(fileUpload());

// get product module
var Product = require("../models/product");

// get category module
var Category = require("../models/category");

// GET products index
router.get("/", isAdmin, async function (req, res) {
  var count;

  Product.countDocuments(function (err, c) {
    count = c;
  });

  const products = await Product.find();

  res.render("../admin/products", {
    products: products,
    count: count,
  });
});

// GET add product
router.get("/add-product", isAdmin, function (req, res) {
  var title = "";
  var desc = "";
  var price = "";

  Category.find(function (err, categories) {
    res.render("../admin/add_product", {
      title: title,
      desc: desc,
      categories: categories,
      price: price,
    });
  });
});

// POST add product
router.post("/add-product", function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    // var imageFile = typeof req.files.target_file !== "undefined" ? req.files.target_file.name : "";
    var imageFile = "";
  } else {
    var imageFile =
      typeof req.files.image !== "undefined" ? req.files.image.name : "";
  }

  // if (!req.files || Object.keys(req.files).length === 0) {
  //     req.flash('danger', 'No image added!');
  //     return Category.find(function(err, categories){
  //         res.render('../admin/add_product', {
  //             errors: errors,
  //             title:title,
  //             desc:desc,
  //             categories: categories,
  //             price:price
  //         });

  //     });
  // }

  req.checkBody("title", "Title must have a value").notEmpty();
  req.checkBody("desc", "Description must have a value").notEmpty();
  req.checkBody("price", "Price must have a value").isDecimal();
  req.checkBody("image", "You must upload an image").isImage(imageFile);

  var title = req.body.title;
  var slug = title.replace(/\s+/g, "-").toLowerCase();
  var desc = req.body.desc;
  var price = req.body.price;
  var category = req.body.category;

  var errors = req.validationErrors();

  if (errors) {
    Category.find(function (err, categories) {
      res.render("../admin/add_product", {
        errors: errors,
        title: title,
        desc: desc,
        categories: categories,
        price: price,
      });
    });
  } else {
    Product.findOne({ slug: slug }, function (err, product) {
      if (product) {
        req.flash("danger", "Product title exists, choose another.");
        Category.find(function (err, categories) {
          res.render("../admin/add_product", {
            title: title,
            desc: desc,
            categories: categories,
            price: price,
          });
        });
      } else {
        var price2 = parseFloat(price).toFixed(2);
        var product = new Product({
          title: title,
          slug: slug,
          desc: desc,
          price: price2,
          category: category,
          image: imageFile,
        });

        product.save(function (err) {
          if (err) return console.log(err);

          // mkdirp("public/product_images/" + product._id , function(err){
          //     console.log(err);
          // });
          // mkdirp("public/product_images/" + product._id + "/gallery" , function(err){
          //     console.log(err);
          // });
          // mkdirp("public/product_images/" + product._id + "/gallery/thumbs" , console.error());

          // mkdirp("public/product_images/" + product._id)
          // .catch(console.log(err));

          // mkdirp("public/product_images/" + product._id + "/gallery")
          // .catch(console.log(err));

          // mkdirp("public/product_images/" + product._id + "/gallery/thumbs")
          // .catch(console.log(err));

          fs.mkdir(
            "public/product_images/" + product._id,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/product_images/" + product._id + "/gallery",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/product_images/" + product._id + "/gallery/thumbs",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );

          if (imageFile != "") {
            var productImage = req.files.image;
            var Uploadpath =
              "public/product_images/" + product._id + "/" + imageFile;

            // var path1 = path.join(__dirname, "public/product_images/", product._id , productImage.name);
            // productImage.mv(path, function(err){
            //     return console.log(err);
            // });
            // var path1 = path.join(__dirname, "public/product_images/", product._id , productImage.name);
            productImage.mv(Uploadpath, (err) => {
              if (err) return console.log(err);
            });
          }

          req.flash("success", "Product added!");
          res.redirect("/admin/products");
        });
      }
    });
  }
});

// GET edit product
router.get("/edit-product/:id", isAdmin, function (req, res) {
  var errors;

  if (req.session.errors) errors = req.session.errors;
  req.session.errors = null;

  Category.find(function (err, categories) {
    Product.findById(req.params.id, function (err, p) {
      if (err) {
        console.log(err);
        res.redirect("/admin/products");
      } else {
        var galleryDir = "public/product_images/" + p._id + "/gallery";
        var galleryImages = null;

        fs.readdir(galleryDir, function (err, files) {
          if (err) {
            console.log(err);
          } else {
            galleryImages = files;

            res.render("../admin/edit_product", {
              title: p.title,
              errors: errors,
              desc: p.desc,
              categories: categories,
              category: p.category.replace(/\s+/g, "-").toLowerCase(),
              price: parseFloat(p.price).toFixed(2),
              image: p.image,
              galleryImages: galleryImages,
              id: p._id,
            });
          }
        });
      }
    });
  });
});

// POST edit product
router.post("/edit-product/:id", function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    // var imageFile = typeof req.files.target_file !== "undefined" ? req.files.target_file.name : "";
    var imageFile = "";
  } else {
    imageFile =
      typeof req.files.image !== "undefined" ? req.files.image.name : "";
  }

  req.checkBody("title", "Title must have a value").notEmpty();
  req.checkBody("desc", "Description must have a value").notEmpty();
  req.checkBody("price", "Price must have a value").isDecimal();
  req.checkBody("image", "You must upload an image").isImage(imageFile);

  var title = req.body.title;
  var slug = title.replace(/\s+/g, "-").toLowerCase();
  var desc = req.body.desc;
  var price = req.body.price;
  var category = req.body.category;
  var pimage = req.body.pimage;
  var id = req.params.id;

  var errors = req.validationErrors();

  if (errors) {
    req.session.errors = errors;
    res.redirect("/admin/products/edit-product/" + id);
  } else {
    Product.findOne({ slug: slug, _id: { $ne: id } }, function (err, p) {
      if (err) console.log(err);
      if (p) {
        req.flash("danger", "Product Title exists, choose another.");
        res.redirect("/admin/products/edit-product/" + id);
      } else {
        Product.findById(id, function (err, p) {
          if (err) console.log(err);
          p.title = title;
          p.slug = slug;
          p.desc = desc;
          p.price = parseFloat(price).toFixed(2);
          p.category = category;

          if (imageFile != "") {
            p.image = imageFile;
          }

          fs.mkdir(
            "public/product_images/" + id,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );

          p.save(function (err) {
            if (err) console.log(err);

            if (imageFile != "") {
              if (pimage != "") {
                fs.rm(
                  "public/product_images/" + id + "/" + pimage,
                  function (err) {
                    if (err) console.log(err);

                    var productImage = req.files.image;
                    var Uploadpath =
                      "public/product_images/" + id + "/" + imageFile;

                    productImage.mv(Uploadpath, (err) => {
                      if (err) return console.log(err);
                    });
                  }
                );
              }
            }

            req.flash("success", "Product edited!");
            res.redirect("/admin/products/edit-product/" + id);
          });
        });
      }
    });
  }
});

// POST product gallery
router.post("/product-gallery/:id", function (req, res) {
  var productImage = req.files.file;
  var id = req.params.id;
  var path1 = "public/product_images/" + id + "/gallery/" + productImage.name;
  var thumbsPath =
    "public/product_images/" + id + "/gallery/thumbs/" + productImage.name;

  productImage.mv(path1, function (err) {
    if (err) console.log(err);
    resizeImg(fse.readFileSync(path1), { width: 100, height: 100 }).then(
      function (buf) {
        fse.writeFileSync(thumbsPath, buf);
      }
    );
  });

  res.sendStatus(200);
});

// GET delete image
router.get("/delete-image/:image", isAdmin, function (req, res) {
  var originalImage =
    "public/product_images/" + req.query.id + "/gallery/" + req.params.image;
  var thumbImage =
    "public/product_images/" +
    req.query.id +
    "/gallery/thumbs/" +
    req.params.image;

  fse.remove(originalImage, function (err) {
    if (err) {
      console.log(err);
    } else {
      fse.remove(thumbImage, function (err) {
        if (err) {
          console.log(err);
        } else {
          req.flash("success", "Image deleted!");
          res.redirect("/admin/products/edit-product/" + req.query.id);
        }
      });
    }
  });
});

// GET delete product
router.get("/delete-product/:id", isAdmin, function (req, res) {
  var id = req.params.id;
  var path1 = "public/product_images/" + id;

  fse.remove(path1, function (err) {
    if (err) {
      console.log(err);
    } else {
      Product.findByIdAndRemove(id, function (err) {
        if (err) return console.log(err);

        req.flash("success", "Product Deleted!");
        res.redirect("/admin/products");
      });
    }
  });
});

// Exports
module.exports = router;
