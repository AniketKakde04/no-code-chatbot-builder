import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize embeddings once
embeddings = HuggingFaceEmbeddings(model_name="all-miniLM-L6-v2")

VECTOR_STORAGE_PATH = "./chroma_db"

def ingest_file(file_path: str, bot_id: str):
    """ 
    Reads a PDF, splits it and stores vectors in ChromaDB under a collection name 'bot_id'.
    Returns (success: bool, result: any).
    """
    try:
        logger.info(f"Ingesting file: {file_path} for bot_id: {bot_id}")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        if not docs:
            logger.warning("No documents found in PDF.")
            return False, "No documents found in PDF."

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200
        )

        splits = text_splitter.split_documents(docs)
        
        if not splits:
            logger.warning("No splits created from documents.")
            return False, "No text chunks created."

        Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            persist_directory=VECTOR_STORAGE_PATH,
            collection_name=bot_id
        )
        
        logger.info(f"Successfully ingested {len(splits)} chunks.")
        return True, len(splits)

    except Exception as e:
        logger.error(f"Error ingesting file: {e}") 
        return False, str(e)
    
def get_answer(bot_id: str, question: str, api_key: str):
    """ 
    Returns the answer to the question using RAG.
    Returns the answer string or an error message.
    """

    try:
        vectorstore = Chroma(
            persist_directory=VECTOR_STORAGE_PATH,
            collection_name=bot_id,
            embedding_function=embeddings
        )
    
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

        llm = ChatGoogleGenerativeAI(
            google_api_key=api_key, 
            model="gemini-2.5-flash", 
            temperature=0.7
        )
    
        prompt = ChatPromptTemplate.from_template("""
        You are a helpful AI assistant. Use the following context to answer the user's question.
        If the answer is not in the context, politely say you don't know.
        
        Context:
        {context}
        
        Question: {input}
        """)

        document_chain = create_stuff_documents_chain(llm, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        response = retrieval_chain.invoke({"input": question})
        return response["answer"]
        
    except Exception as e:
        logger.error(f"Error getting answer: {e}")
        # Return the error as a string so the user sees it in the chat interface
        return f"I encountered an error retrieving the answer: {str(e)}"