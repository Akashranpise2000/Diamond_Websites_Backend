const BlogPost = require('../models/BlogPost');
const { validationResult } = require('express-validator');

// @desc    Get all blog posts
// @route   GET /api/v1/blog
// @access  Public
const getBlogPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const tag = req.query.tag;
    const search = req.query.search;

    // Build filter
    const filter = { status: 'published' };

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const blogPosts = await BlogPost.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-comments');

    const total = await BlogPost.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: blogPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single blog post
// @route   GET /api/v1/blog/:id
// @access  Public
const getBlogPost = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id)
      .populate('author', 'firstName lastName')
      .populate('comments.user', 'firstName lastName');

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment view count
    blogPost.views += 1;
    await blogPost.save();

    res.status(200).json({
      success: true,
      data: blogPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get blog post by slug
// @route   GET /api/v1/blog/slug/:slug
// @access  Public
const getBlogPostBySlug = async (req, res) => {
  try {
    const blogPost = await BlogPost.findOne({
      slug: req.params.slug,
      status: 'published'
    })
      .populate('author', 'firstName lastName')
      .populate('comments.user', 'firstName lastName');

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment view count
    blogPost.views += 1;
    await blogPost.save();

    res.status(200).json({
      success: true,
      data: blogPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get blog categories
// @route   GET /api/v1/blog/categories
// @access  Public
const getBlogCategories = async (req, res) => {
  try {
    const categories = await BlogPost.distinct('category', { status: 'published' });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get blog tags
// @route   GET /api/v1/blog/tags
// @access  Public
const getBlogTags = async (req, res) => {
  try {
    const tags = await BlogPost.distinct('tags', { status: 'published' });

    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Like/unlike blog post
// @route   POST /api/v1/blog/:id/like
// @access  Private
const toggleBlogPostLike = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const userId = req.user._id;
    const userIndex = blogPost.likes.users.indexOf(userId);

    if (userIndex > -1) {
      // User already liked, remove like
      blogPost.likes.users.splice(userIndex, 1);
      blogPost.likes.count -= 1;
    } else {
      // User hasn't liked, add like
      blogPost.likes.users.push(userId);
      blogPost.likes.count += 1;
    }

    await blogPost.save();

    res.status(200).json({
      success: true,
      data: {
        likes: blogPost.likes.count,
        isLiked: userIndex === -1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add comment to blog post
// @route   POST /api/v1/blog/:id/comments
// @access  Private
const addBlogPostComment = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const newComment = {
      user: req.user._id,
      comment: req.body.comment,
      isApproved: true // Auto-approve for now
    };

    blogPost.comments.push(newComment);
    await blogPost.save();

    // Populate the new comment
    await blogPost.populate('comments.user', 'firstName lastName');

    const addedComment = blogPost.comments[blogPost.comments.length - 1];

    res.status(201).json({
      success: true,
      data: addedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create blog post
// @route   POST /api/v1/blog
// @access  Private (Admin only)
const createBlogPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const blogPostData = {
      ...req.body,
      author: req.user._id
    };

    if (blogPostData.status === 'published' && !blogPostData.publishedAt) {
      blogPostData.publishedAt = new Date();
    }

    const blogPost = await BlogPost.create(blogPostData);

    await blogPost.populate('author', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: blogPost
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Blog post with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update blog post
// @route   PUT /api/v1/blog/:id
// @access  Private (Admin only)
const updateBlogPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if user is the author or admin
    if (blogPost.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this blog post'
      });
    }

    const updateData = { ...req.body };

    if (updateData.status === 'published' && blogPost.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const updatedBlogPost = await BlogPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: updatedBlogPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/v1/blog/:id
// @access  Private (Admin only)
const deleteBlogPost = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);

    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if user is the author or admin
    if (blogPost.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blog post'
      });
    }

    await BlogPost.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getBlogPosts,
  getBlogPost,
  getBlogPostBySlug,
  getBlogCategories,
  getBlogTags,
  toggleBlogPostLike,
  addBlogPostComment,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
};