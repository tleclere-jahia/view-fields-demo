<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<c:set var="image" value="${currentNode.properties.cardImage.node}"/>
<div class="view-fields-demo view-fields-demo--card">
    <c:if test="${not empty image}">
        <template:addCacheDependency node="${image}"/>
        <img src="<c:url value='${image.url}'/>" alt=""/>
    </c:if>
    <h3>${fn:escapeXml(currentNode.displayableName)}</h3>
    <h4>${fn:escapeXml(currentNode.properties.cardSubtitle.string)}</h4>
    <p>${fn:escapeXml(currentNode.properties.intro.string)}</p>
</div>
