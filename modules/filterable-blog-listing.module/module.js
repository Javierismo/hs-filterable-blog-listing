/**
 * HubSpot Filterable Blog Listing Module
 * Author: Javier Fuentes
 * Repository: https://github.com/Javierismo/hs-filterable-blog-listing
 * License: MIT
 */

// Keep state local to the module so it does not collide with other page content.
(function () {
    var selectedTag = null;
    var currentPage = 2;
    var fetching = false;
    var blogOutOfPosts = false;
    var postContainer = document.querySelector('.blog-posts-container');
    var loadMoreButton = document.querySelector('.ht-filterable-blog-listing__load-more');
    var blogLoader = document.querySelector('#blogLoader');
    var endMessage = document.querySelector('#blogEndMessage');
    var listing = document.querySelector('.ht-filterable-blog-listing');
    var tagFilterContainer = document.querySelector('#tagFilterContainer');
    var blogUrl = document.querySelector('.ht-filterable-blog-listing').getAttribute('data-blog-url');
    var totalPages = loadMoreButton ? parseInt(loadMoreButton.getAttribute('data-pages'), 10) : NaN;

    if (!postContainer || !loadMoreButton) {
        return;
    }

    // Build the same blog URL HubSpot would serve, then append the selected tag and page so the module can fetch HTML fragments.
    function buildAjaxUrl() {
        var url = blogUrl;
        if (selectedTag) {
            url = blogUrl + '/tag/' + selectedTag;
        }
        url += '/page/' + currentPage;
        return url;
    }

    function hideEndMessage() {
        if (endMessage) {
            endMessage.hidden = true;
        }
    }

    // Sync the visual active state with the currently selected tag.
    function updateTagFilter(tag) {
        var tagButtons = document.querySelectorAll('.ht-filterable-blog-listing__filter-tag');
        tagButtons.forEach(function(btn) {
            if (btn.getAttribute('data-tag') === tag) {
                btn.classList.add('ht-filterable-blog-listing__filter-tag--active');
            } else {
                btn.classList.remove('ht-filterable-blog-listing__filter-tag--active');
            }
        });
    }

    // Reset the list when the filter changes so the user sees the first page of the new result set.
    async function loadFirstPageForCurrentFilter() {
        var parser;
        var page;
        var posts;
        var firstPageUrl = selectedTag ? (blogUrl + '/tag/' + selectedTag + '/page/1') : (blogUrl + '/page/1');

        if (fetching) {
            return;
        }

        fetching = true;
        setBusyState(true);
        setLoadingState(true);
        hideErrorMessage();
        hideEndMessage();
        postContainer.innerHTML = '';

        try {
            var response = await fetch(firstPageUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load filtered posts.');
            }

            parser = new DOMParser();
            page = parser.parseFromString(await response.text(), 'text/html');
            posts = page.querySelectorAll('.blog-post-card');

            if (!posts.length) {
                blogOutOfPosts = true;
                loadMoreButton.style.display = 'none';
                showEndMessage();
                return;
            }

            posts.forEach(function (post) {
                postContainer.appendChild(post);
            });

            var nextPageButton = page.querySelector('.ht-filterable-blog-listing__load-more');
            if (nextPageButton) {
                totalPages = parseInt(nextPageButton.getAttribute('data-pages'), 10);
            }

            currentPage = 2;
            blogOutOfPosts = !Number.isNaN(totalPages) && totalPages <= 1;

            if (blogOutOfPosts) {
                loadMoreButton.style.display = 'none';
                showEndMessage();
            } else {
                loadMoreButton.style.display = '';
            }
        } catch (error) {
            console.error(error);
            showErrorMessage();
        } finally {
            fetching = false;
            setBusyState(false);
            setLoadingState(false);
        }
    }

    if (tagFilterContainer) {
        var tagButtons = tagFilterContainer.querySelectorAll('.ht-filterable-blog-listing__filter-tag');
        tagButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var tag = this.getAttribute('data-tag');
                if (tag === selectedTag || (tag === 'all' && !selectedTag)) {
                    return;
                }
                selectedTag = tag === 'all' ? null : tag;
                updateTagFilter(tag);
                loadFirstPageForCurrentFilter();
            });
        });
    }

    function showEndMessage() {
        if (endMessage) {
            endMessage.hidden = false;
        }
    }

    function showErrorMessage() {
        var errorMessage = document.querySelector('#blogErrorMessage');
        if (errorMessage) {
            errorMessage.hidden = false;
            loadMoreButton.style.display = '';
        }
    }

    function hideErrorMessage() {
        var errorMessage = document.querySelector('#blogErrorMessage');
        if (errorMessage) {
            errorMessage.hidden = true;
        }
    }

    // After appending new posts, scroll the viewport near the first new card so the interaction feels connected.
    function scrollToFirstNewPost(postsCount) {
        var allPosts = postContainer.querySelectorAll('.blog-post-card');
        if (allPosts.length > postsCount) {
            var firstNewPost = allPosts[postsCount];
            var elementTop = firstNewPost.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementTop - 100, behavior: 'smooth' });
        }
    }

    // aria-busy gives assistive tech a simple signal that the listing is updating.
    function setBusyState(isBusy) {
        if (listing) {
            listing.setAttribute('aria-busy', String(isBusy));
        }
    }

    // Loading state swaps the button for a lightweight status message so the layout does not jump.
    function setLoadingState(isLoading) {
        if (blogLoader) {
            blogLoader.style.display = isLoading ? 'inline-flex' : 'none';
        }

        if (isLoading) {
            loadMoreButton.style.display = 'none';
            return;
        }

        if (!blogOutOfPosts) {
            loadMoreButton.style.display = '';
        }
    }

    if (!Number.isNaN(totalPages) && totalPages === 1) {
        blogOutOfPosts = true;
        loadMoreButton.style.display = 'none';
        showEndMessage();
    }

    // Load more keeps the existing cards in place and appends the next page so the user can continue browsing smoothly.
    async function loadMorePosts(event) {
        var parser;
        var page;
        var posts;
        var postsBeforeLoad;

        event.preventDefault();

        if (blogOutOfPosts || fetching) {
            return;
        }

        postsBeforeLoad = postContainer.querySelectorAll('.blog-post-card').length;

        fetching = true;
        setBusyState(true);
        setLoadingState(true);
        hideErrorMessage();

        try {
            var response = await fetch(buildAjaxUrl(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
            });

            if (!response.ok) {
                throw new Error('Failed to load more posts.');
            }

            parser = new DOMParser();
            page = parser.parseFromString(await response.text(), 'text/html');
            posts = page.querySelectorAll('.blog-post-card');

            if (!posts.length) {
                blogOutOfPosts = true;
                loadMoreButton.style.display = 'none';
                showEndMessage();
                return;
            }

            posts.forEach(function (post) {
                postContainer.appendChild(post);
            });

            scrollToFirstNewPost(postsBeforeLoad);

            if (!Number.isNaN(totalPages) && currentPage === totalPages) {
                console.log('Reached last page:', currentPage, 'of', totalPages);
                blogOutOfPosts = true;
                loadMoreButton.style.display = 'none';
                showEndMessage();
                return;
            }

            currentPage += 1;

        } catch (error) {
            console.error(error);
            showErrorMessage();
        } finally {
            fetching = false;
            setBusyState(false);
            setLoadingState(false);
        }
    }

    loadMoreButton.addEventListener('click', loadMorePosts);
  }());
