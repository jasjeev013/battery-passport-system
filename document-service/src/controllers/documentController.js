const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const { uploadToS3, getSignedUrl, deleteFromS3, checkFileExists } = require('../utils/s3Client');

// Upload a file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { description, isPublic } = req.body;

    // Upload file to S3
    const s3Data = await uploadToS3(buffer, originalname, mimetype);

    // Create document record in database
    const document = new Document({
      docId: uuidv4(),
      fileName: originalname,
      originalName: originalname,
      fileSize: size,
      fileType: mimetype,
      s3Key: s3Data.key,
      s3Bucket: s3Data.bucket,
      s3Location: s3Data.location,
      uploadedBy: req.user.userId,
      description: description || '',
      isPublic: isPublic === 'true'
    });

    await document.save();

    // Populate user info if needed
    await document.populate('uploadedBy', 'email role');

    res.status(201).json({
      message: 'File uploaded successfully',
      document: {
        docId: document.docId,
        fileName: document.fileName,
        createdAt: document.createdAt,
        fileSize: document.fileSize,
        fileType: document.fileType
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// Get file download URL
const getDownloadUrl = async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findOne({ docId, isActive: true });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access (admin, owner, or public document)
    if (req.user.role !== 'admin' && 
        document.uploadedBy.toString() !== req.user.userId &&
        !document.isPublic) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this file.' 
      });
    }

    // Check if file exists in S3
    const fileExists = await checkFileExists(document.s3Key);
    if (!fileExists) {
      return res.status(404).json({ message: 'File not found in storage' });
    }

    // Generate signed URL (valid for 1 hour)
    const downloadUrl = await getSignedUrl(document.s3Key, document.fileName, 3600);

    res.json({
      message: 'Download URL generated successfully',
      downloadUrl,
      fileName: document.fileName,
      expiresIn: '1 hour'
    });
  } catch (error) {
    console.error('Download URL error:', error);
    res.status(500).json({ message: 'Server error generating download URL' });
  }
};

// Get document metadata
const getDocumentMetadata = async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findOne({ docId, isActive: true })
      .populate('uploadedBy', 'email role');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access (admin, owner, or public document)
    if (req.user.role !== 'admin' && 
        document.uploadedBy._id.toString() !== req.user.userId &&
        !document.isPublic) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this document.' 
      });
    }

    res.json({
      message: 'Document metadata retrieved successfully',
      document: {
        docId: document.docId,
        fileName: document.fileName,
        originalName: document.originalName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        description: document.description,
        isPublic: document.isPublic,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      }
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ message: 'Server error retrieving document metadata' });
  }
};

// Update document metadata
const updateDocumentMetadata = async (req, res) => {
  try {
    const { docId } = req.params;
    const { description, isPublic } = req.body;

    const document = await Document.findOne({ docId, isActive: true });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is admin or the uploader
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only update your own documents.' 
      });
    }

    // Update metadata
    if (description !== undefined) document.description = description;
    if (isPublic !== undefined) document.isPublic = isPublic === 'true';

    await document.save();
    await document.populate('uploadedBy', 'email role');

    res.json({
      message: 'Document metadata updated successfully',
      document: {
        docId: document.docId,
        fileName: document.fileName,
        description: document.description,
        isPublic: document.isPublic,
        updatedAt: document.updatedAt
      }
    });
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ message: 'Server error updating document metadata' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findOne({ docId, isActive: true });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is admin or the uploader
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only delete your own documents.' 
      });
    }

    // Delete from S3
    await deleteFromS3(document.s3Key);

    // Soft delete from database
    document.isActive = false;
    await document.save();

    res.json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error during document deletion' });
  }
};

// Get user's documents
const getUserDocuments = async (req, res) => {
  try {
    let query = { isActive: true };
    
    // If user is not admin, only show their own documents
    if (req.user.role !== 'admin') {
      query.uploadedBy = req.user.userId;
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'email role')
      .sort({ createdAt: -1 })
      .select('-s3Key -s3Bucket -s3Location');

    res.json({
      message: 'Documents retrieved successfully',
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error retrieving documents' });
  }
};

module.exports = {
  uploadFile,
  getDownloadUrl,
  getDocumentMetadata,
  updateDocumentMetadata,
  deleteDocument,
  getUserDocuments
};