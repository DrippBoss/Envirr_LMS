from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """Page-number pagination that returns the same ``{count, page, page_size,
    results}`` envelope already used by the question-bank editor endpoint.

    Consumers read ``res.data.results``; older callers that expect a bare array
    can degrade gracefully with a ``res.data.results ?? res.data`` fallback.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'num_pages': self.page.paginator.num_pages,
            'results': data,
        })
