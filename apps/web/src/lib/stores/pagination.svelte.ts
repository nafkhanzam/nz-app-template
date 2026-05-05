export function usePagination(initialPageSize = 24) {
  let page = $state(1);
  let pageSize = $state(initialPageSize);

  return {
    get page() {
      return page;
    },
    get pageSize() {
      return pageSize;
    },
    get skip() {
      return (page - 1) * pageSize;
    },
    get take() {
      return pageSize;
    },
    setPage(p: number) {
      page = p;
    },
    setPageSize(s: number) {
      pageSize = s;
      page = 1;
    },
    reset() {
      page = 1;
    },
  };
}

export type Pagination = ReturnType<typeof usePagination>;
