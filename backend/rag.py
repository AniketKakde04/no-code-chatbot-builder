 import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, CSVLoader, WebBaseLoader
from langchain_community.document_loaders import SQLDatabaseLoader
from langchain_community.utilities import SQLDatabase
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


def ingest_file(file_path: str, bot_id: str, sql_query: str = None):
    """ 
    Reads PDF / CSV / SQL / URL, splits it and stores vectors in ChromaDB
    under a collection name 'bot_id'.
    Returns (success: bool, result: any).
    """
    try:
        logger.info(f"Ingesting file: {file_path} for bot_id: {bot_id}")

        # -------- Loader Selection --------
        if file_path.startswith("https://") or file_path.startswith("http://"):
            loader = WebBaseLoader(f"https://r.jina.ai/{file_path}")

        elif file_path.lower().endswith(".pdf"):
            loader = PyPDFLoader(file_path)

        elif file_path.lower().endswith(".csv"):
            loader = CSVLoader(
                file_path=file_path,
                encoding="utf-8",
                csv_args={"delimiter": ","}
            )

        elif file_path.startswith(("sqlite:///", "mysql", "postgresql")):
            if not sql_query:
                return False, "SQL query is required for SQL ingestion."

            db = SQLDatabase.from_uri(file_path)
            loader = SQLDatabaseLoader(db=db, query=sql_query)

        else:
            return False, "Unsupported file type or database URI."

        # -------- Load Documents --------
        docs = loader.load()

        if not docs:
            logger.warning("No documents found.")
            return False, "No documents found."

        # -------- Split Text --------
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

        splits = text_splitter.split_documents(docs)

        if not splits:
            logger.warning("No text chunks created.")
            return False, "No text chunks created."

        # -------- Store Vectors --------
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
        return f"I encountered an error retrieving the answer: {str(e)}"


def delete_bot_data(bot_id: str):
    """
    Deletes the vector store collection for the bot.
    """
    try:
        logger.info(f"Deleting vector data for bot: {bot_id}")
        Chroma(
            persist_directory=VECTOR_STORAGE_PATH,
            collection_name=bot_id,
            embedding_function=embeddings
        ).delete_collection()
        return True
    except Exception as e:
        logger.error(f"Error deleting bot data: {e}")
        return False
	