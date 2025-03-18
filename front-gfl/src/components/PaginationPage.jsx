import {Pagination} from "@mui/material";

export default function PaginationPage({ totalItems, perPage, page, setPage }){
    return <Pagination
        count={Math.ceil((totalItems ?? 0) / perPage)}
        variant="outlined"
        color="primary"
        siblingCount={0}
        page={page + 1}
        onChange={(_, e) => setPage(e - 1)} />
}