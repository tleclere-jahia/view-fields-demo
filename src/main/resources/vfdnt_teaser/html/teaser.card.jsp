<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<div class="teaser teaser--card">
    <h3>${fn:escapeXml(currentNode.displayableName)} <small>${fn:escapeXml(currentNode.properties.badge.string)}</small></h3>
    <h4>${fn:escapeXml(currentNode.properties.cardSubtitle.string)}</h4>
    <p>${fn:escapeXml(currentNode.properties.teaserText.string)}</p>
</div>
