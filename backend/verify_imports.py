import sys
import os

# Add the current directory to sys.path to mimic running from backend root
sys.path.append(os.getcwd())

print("Attempting imports...")
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    print("Success: langchain_google_genai")
    from langchain_huggingface import HuggingFaceEmbeddings
    print("Success: langchain_huggingface")
    from langchain_chroma import Chroma
    print("Success: langchain_chroma")
    from langchain_community.document_loaders import PyPDFLoader
    print("Success: langchain_community.document_loaders")
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    print("Success: langchain_text_splitters")
    from langchain.chains import create_retrieval_chain
    print("Success: langchain.chains.create_retrieval_chain")
    from langchain.chains.combine_documents import create_stuff_documents_chain
    print("Success: langchain.chains.combine_documents")
    from langchain_core.prompts import ChatPromptTemplate
    print("Success: langchain_core.prompts")
    
    print("\nAll imports successful!")
except ImportError as e:
    print(f"\nImport failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\nUnexpected error: {e}")
    sys.exit(1)
