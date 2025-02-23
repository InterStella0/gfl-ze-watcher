import {ErrorBoundary} from "react-error-boundary";

function ErrorMessage({ message }){
    return <p>Something went wrong :/<br />
        {message}
    </p>
}
export default function ErrorCatch({ message, children }){
    return <ErrorBoundary fallback={<ErrorMessage message={message} />}>
        {children}
    </ErrorBoundary>
}